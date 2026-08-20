-- Mars Space — 015 Scheduled jobs and Storage buckets
--
-- Three functions were written to be run on a schedule and then never
-- scheduled, which made two features silently inert and one actively
-- exploitable:
--
--   expire_stale_holds()       Holds sit INSIDE the bookings exclusion
--                              constraint predicate, so an unexpired hold
--                              blocks its slot permanently. create_booking is
--                              reachable by anon for guest checkout, so one
--                              script could have held every room on the floor
--                              forever. create_booking now also sweeps the
--                              specific slot it is booking, but that only
--                              frees slots somebody actively re-requests —
--                              the global sweeper is still needed.
--
--   allocate_monthly_credits() Without it no company ever receives its plan
--                              allowance, so the entire credit feature does
--                              nothing in production.
--
--   mark_overdue_invoices()    'overdue' is a function of the calendar. An
--                              unpaid invoice receives no trigger, so nothing
--                              would ever move it off 'unpaid'.

-- ---------------------------------------------------------------------------
-- pg_cron
--
-- Supabase convention is to install extensions into the `extensions` schema
-- rather than public. pg_cron is an exception: it must live in its own schema
-- and is only available on Supabase's hosted Postgres.
--
-- Everything is wrapped so this migration still applies against a plain
-- PostgreSQL (CI, the local throwaway cluster used by scripts/db-test.sh)
-- where pg_cron is not installed. The jobs are the only part skipped there.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  else
    raise notice 'pg_cron unavailable — skipping scheduled jobs (expected outside Supabase)';
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;

  -- cron.schedule is an upsert on job name, so re-running this migration
  -- re-points the schedule instead of creating duplicates.

  -- Every minute: free slots whose 10-minute checkout hold has lapsed.
  perform cron.schedule(
    'mars-expire-stale-holds',
    '* * * * *',
    $job$select public.expire_stale_holds()$job$
  );

  -- 21:05 UTC daily, which is 00:05 the next day in Riyadh (UTC+3). pg_cron
  -- runs in the database timezone (UTC on Supabase) and parses plain five-field
  -- cron — there is no 'L' last-day-of-month field — so the month boundary
  -- cannot be expressed directly. Daily is equivalent here: the period comes
  -- from now() in Riyadh time and allocation is idempotent per contract per
  -- period, so the run at 21:05 UTC on the last day of the month is the one
  -- that grants the new period's hours and every later run that month is a
  -- no-op. It also self-heals — a failed run is retried within 24h instead of
  -- leaving members without credits until the next month.
  perform cron.schedule(
    'mars-allocate-monthly-credits',
    '5 21 * * *',
    $job$select public.allocate_monthly_credits()$job$
  );

  -- 01:00 Riyadh daily (22:00 UTC): move unpaid invoices past due to overdue.
  perform cron.schedule(
    'mars-mark-overdue-invoices',
    '0 22 * * *',
    $job$select public.mark_overdue_invoices()$job$
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Storage buckets
--
-- Three buckets are referenced by columns that already exist
-- (invoices.pdf_path, repair_attachments.storage_path,
-- contracts.document_path) but no bucket was ever created, so every upload
-- would have failed at runtime.
--
-- All three are PRIVATE. These hold tax invoices, signed contracts and photos
-- of the inside of members' offices; a public bucket would make every one of
-- them readable by URL to anyone who guessed the path.
--
-- Guarded so the migration still applies to a plain PostgreSQL without the
-- Supabase storage schema.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'storage' and table_name = 'buckets') then
    raise notice 'storage schema absent — skipping buckets (expected outside Supabase)';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('invoices', 'invoices', false, 10485760,
     array['application/pdf']),
    ('contracts', 'contracts', false, 10485760,
     array['application/pdf']),
    ('repair-attachments', 'repair-attachments', false, 10485760,
     array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
end
$$;

-- ---------------------------------------------------------------------------
-- Storage RLS
--
-- storage.objects has its own RLS. Files are laid out with the owning
-- company's uuid as the first path segment — 'repair-attachments/<company>/…' —
-- so a member's access can be decided from the path alone.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'storage' and table_name = 'objects') then
    return;
  end if;

  execute $ddl$
    drop policy if exists mars_company_files_read on storage.objects;
    create policy mars_company_files_read on storage.objects
      for select to authenticated
      using (
        bucket_id in ('invoices', 'contracts', 'repair-attachments')
        and (
          (select public.is_staff())
          -- First path segment is the company uuid.
          or (storage.foldername(name))[1] in (select public.current_company_ids()::text)
        )
      );

    drop policy if exists mars_repair_uploads on storage.objects;
    create policy mars_repair_uploads on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'repair-attachments'
        and public.has_company_perm(
              ((storage.foldername(name))[1])::uuid, 'submit_repairs')
      );

    -- Invoices and contracts are produced by Mars Space, never uploaded by a
    -- member, so there is deliberately no member INSERT policy for them.
    drop policy if exists mars_staff_files_write on storage.objects;
    create policy mars_staff_files_write on storage.objects
      for all to authenticated
      using ((select public.is_staff()))
      with check ((select public.is_staff()));
  $ddl$;
end
$$;
