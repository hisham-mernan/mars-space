-- Mars Space — post-deploy verification
--
-- Read-only. Paste into the Supabase dashboard SQL Editor (or run with psql)
-- after `supabase db reset --linked` to confirm the schema that actually
-- landed matches the one the test suite covers.
--
-- Every row should read PASS. Anything else is described in the detail column.
--
-- This is deliberately separate from supabase/tests/*.test.sql: those create
-- fixtures and roll back, which is fine locally but not something to point at
-- a live project. This one only reads catalogue metadata.

with checks as (

  -- 1. Every migration applied. 15 files as of the schema audit fixes.
  select 1 as ord, 'migrations applied' as check_name,
         count(*)::text || ' of 15' as detail,
         count(*) >= 15 as ok
  from supabase_migrations.schema_migrations

  union all
  -- 2. RLS on every public table. A table missing from this is world-readable
  --    through PostgREST, which is the single most dangerous omission possible.
  select 2, 'RLS enabled on all tables',
         coalesce(string_agg(c.relname, ', '), 'none missing'),
         count(*) = 0
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity

  union all
  -- 3. Every view must be security_invoker, or it silently bypasses the
  --    policies on its base tables and leaks across tenants.
  select 3, 'views are security_invoker',
         coalesce(string_agg(c.relname, ', '), 'all invoker'),
         count(*) = 0
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and not coalesce((select option_value::boolean
                        from pg_options_to_table(c.reloptions)
                       where option_name = 'security_invoker'), false)

  union all
  -- 4. The credit-minting hole. allocate_monthly_credits writes the ledger as
  --    the owner; if anon or authenticated can execute it, anyone holding the
  --    anon key can grant themselves unlimited meeting-room hours.
  select 4, 'credit RPCs not executable by clients',
         coalesce(string_agg(p.proname || ' -> ' || r.rolname, ', '), 'locked down'),
         count(*) = 0
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join (values ('anon'), ('authenticated')) as r(rolname)
  where n.nspname = 'public'
    and p.proname in ('allocate_monthly_credits', 'credit_balance',
                      'expire_stale_holds', 'mark_overdue_invoices',
                      'next_invoice_number', 'next_booking_reference')
    and has_function_privilege(r.rolname, p.oid, 'EXECUTE')

  union all
  -- 5. Guest checkout still has to work, so these two must remain reachable.
  select 5, 'booking RPCs still reachable',
         string_agg(distinct p.proname, ', '),
         count(*) >= 2
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('price_booking', 'create_booking')
    and has_function_privilege('anon', p.oid, 'EXECUTE')

  union all
  -- 6. The double-booking guarantee.
  select 6, 'double-booking exclusion constraint',
         coalesce(string_agg(conname, ', '), 'MISSING'),
         count(*) = 1
  from pg_constraint
  where conrelid = 'public.bookings'::regclass and contype = 'x'

  union all
  -- 7. Unindexed foreign keys. An index only serves an FK when the FK columns
  --    are a LEADING prefix of it, and partial indexes never count.
  select 7, 'no unindexed foreign keys',
         count(*)::text || ' unindexed',
         count(*) = 0
  from (
    select c.conrelid, c.conkey,
           (select array_agg(a.attname order by k.ord)
              from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f' and n.nspname = 'public'
  ) fk
  where not exists (
    select 1 from pg_index i
    where i.indrelid = fk.conrelid and i.indpred is null
      and (select array_agg(a.attname order by k.ord)
             from unnest((string_to_array(i.indkey::text, ' '))::smallint[])
                  with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
          )[1:array_length(fk.cols, 1)] = fk.cols
  )

  union all
  -- 8. Scheduled jobs. Without these, abandoned holds block rooms permanently
  --    and no company ever receives its monthly credit allowance.
  select 8, 'pg_cron jobs scheduled',
         case when not exists (select 1 from pg_extension where extname = 'pg_cron')
              then 'pg_cron NOT INSTALLED'
              else coalesce((select string_agg(jobname, ', ')
                               from cron.job where jobname like 'mars-%'), 'none') end,
         exists (select 1 from pg_extension where extname = 'pg_cron')
         and (select count(*) from cron.job where jobname like 'mars-%') >= 3

  union all
  -- 9. Private Storage buckets for invoices, contracts and repair photos.
  select 9, 'storage buckets private',
         coalesce((select string_agg(id || case when public then ' (PUBLIC!)' else '' end, ', ')
                     from storage.buckets
                    where id in ('invoices','contracts','repair-attachments')), 'none'),
         (select count(*) from storage.buckets
           where id in ('invoices','contracts','repair-attachments') and not public) = 3

  union all
  -- 10. Reference data seeded.
  select 10, 'reference data seeded',
         (select count(*) from public.branches)::text || ' branches, ' ||
         (select count(*) from public.resources)::text || ' resources, ' ||
         (select count(*) from public.membership_plans)::text || ' plans',
         (select count(*) from public.resources) >= 7
         and (select count(*) from public.membership_plans) >= 4

  union all
  -- 11. Public signup must be off — membership is invite-only.
  select 11, 'reminder: confirm signups disabled',
         'Dashboard > Authentication > Sign In / Providers > Email',
         true
)
select case when ok then 'PASS' else 'FAIL' end as result,
       check_name,
       detail
from checks
order by ord;
