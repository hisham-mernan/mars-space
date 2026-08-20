-- Mars Space — 011 Pricing and the booking RPC
--
-- Pricing lives in the database rather than in each client. The website and
-- the mobile app both quote from price_booking(), so a member cannot be shown
-- one figure on their phone and charged another on the web.
--
-- Changes from the legacy JavaScript engine:
--   * KSA weekend is Friday/Saturday (it checked Sunday/Saturday).
--   * The 20% member discount is gone. Members get their plan's credit hours
--     free; anything beyond the allowance bills at the full public rate.

-- ---------------------------------------------------------------------------
-- price_booking — pure quote, no writes. Returns a jsonb breakdown that is
-- stored on the booking so a disputed invoice can be reconstructed.
-- ---------------------------------------------------------------------------
create or replace function public.price_booking(
  p_resource_id uuid,
  p_time_range  tstzrange,
  p_company_id  uuid default null,
  p_addons      jsonb default '[]'    -- [{"addon_id": uuid, "quantity": int}, ...]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_resource      public.resources%rowtype;
  v_hours         numeric(6, 2);
  v_units         numeric(6, 2);
  v_base          numeric(10, 2);
  v_peak          numeric(10, 2) := 0;
  v_weekend       numeric(10, 2) := 0;
  v_gross         numeric(10, 2);
  v_credit_avail  numeric(6, 2) := 0;
  v_credit_used   numeric(6, 2) := 0;
  v_billable_hrs  numeric(6, 2);
  v_covered_ratio numeric(10, 6) := 0;
  v_addons_total  numeric(10, 2) := 0;
  v_quote_only    boolean := false;
  v_subtotal      numeric(10, 2);
  v_vat           numeric(10, 2);
  v_start         timestamptz := lower(p_time_range);
  v_end           timestamptz := upper(p_time_range);
begin
  select * into v_resource from public.resources where id = p_resource_id;
  if not found then
    raise exception 'Resource % not found', p_resource_id using errcode = 'no_data_found';
  end if;

  -- This function is SECURITY DEFINER and reachable by anon (guest checkout
  -- needs it), and it returns credit_available in the quote. Without this
  -- check anyone holding the anon key could read any tenant's remaining
  -- allowance, and probe which company uuids exist, just by passing one in.
  if p_company_id is not null
     and not (public.is_staff() or public.is_company_member(p_company_id)) then
    raise exception 'You do not have access to that company'
      using errcode = 'insufficient_privilege';
  end if;

  v_hours := round(extract(epoch from (v_end - v_start)) / 3600.0, 2);
  if v_hours <= 0 then
    raise exception 'Booking must end after it starts' using errcode = 'check_violation';
  end if;

  -- Day-rate resources (the community hall) bill per started day, not per hour.
  if v_resource.rate_unit = 'day' then
    v_units := ceil(v_hours / 24.0);
  elsif v_resource.rate_unit = 'month' then
    raise exception 'Resource % is assigned by contract, not booked', v_resource.slug
      using errcode = 'check_violation';
  else
    v_units := v_hours;
  end if;

  v_base := round(v_resource.rate * v_units, 2);

  -- Peak surcharge: +10% when the booking overlaps 12:00-15:00 Riyadh.
  if tstzrange(
       (date_trunc('day', v_start at time zone 'Asia/Riyadh') + interval '12 hours')
         at time zone 'Asia/Riyadh',
       (date_trunc('day', v_start at time zone 'Asia/Riyadh') + interval '15 hours')
         at time zone 'Asia/Riyadh'
     ) && p_time_range
  then
    v_peak := round(v_base * 0.10, 2);
  end if;

  -- Weekend surcharge: +15% on Friday/Saturday in Asia/Riyadh.
  if public.is_ksa_weekend(v_start) then
    v_weekend := round(v_base * 0.15, 2);
  end if;

  v_gross := v_base + v_peak + v_weekend;

  -- Meeting-room credits. They apply to hourly rooms and pods only; the
  -- community hall and private offices are outside the allowance.
  if p_company_id is not null
     and v_resource.category in ('meeting_room', 'focus_pod')
  then
    v_credit_avail := greatest(public.credit_balance(p_company_id), 0);
    v_credit_used  := least(v_credit_avail, v_hours);
  end if;

  v_billable_hrs := v_hours - v_credit_used;

  -- Credit offsets the room charge proportionally, surcharges included.
  if v_hours > 0 then
    v_covered_ratio := v_credit_used / v_hours;
  end if;
  v_subtotal := round(v_gross * (1 - v_covered_ratio), 2);

  -- Add-ons are never covered by credit and are charged in full.
  select coalesce(sum(
           case when a.is_quote_only then 0
                else a.price * coalesce((item ->> 'quantity')::int, 1) end), 0),
         coalesce(bool_or(a.is_quote_only), false)
    into v_addons_total, v_quote_only
  from jsonb_array_elements(coalesce(p_addons, '[]')) as item
  join public.addons a on a.id = (item ->> 'addon_id')::uuid
  where a.is_active;

  v_subtotal := v_subtotal + v_addons_total;
  v_vat      := round(v_subtotal * 0.15, 2);

  return jsonb_build_object(
    'resource_id',       p_resource_id,
    'resource_name',     v_resource.name,
    'rate',              v_resource.rate,
    'rate_unit',         v_resource.rate_unit,
    'hours',             v_hours,
    'units',             v_units,
    'base',              v_base,
    'peak_surcharge',    v_peak,
    'weekend_surcharge', v_weekend,
    'gross',             v_gross,
    'credit_available',  v_credit_avail,
    'credit_hours_used', v_credit_used,
    'billable_hours',    v_billable_hrs,
    'addons_total',      v_addons_total,
    'has_quote_only_addon', v_quote_only,
    'subtotal',          v_subtotal,
    'vat_rate',          0.15,
    'vat_amount',        v_vat,
    'total',             round(v_subtotal + v_vat, 2),
    'currency',          'SAR'
  );
end;
$$;

grant execute on function public.price_booking(uuid, tstzrange, uuid, jsonb)
  to authenticated, anon;

-- ---------------------------------------------------------------------------
-- create_booking — one transaction: validate, insert (the exclusion constraint
-- arbitrates), consume credit, attach add-ons, raise an invoice.
--
-- SECURITY DEFINER because it writes credit_entries and invoices, which
-- members must never hold direct INSERT on. It therefore has to authorize the
-- caller itself; it cannot lean on RLS.
-- ---------------------------------------------------------------------------
create or replace function public.create_booking(
  p_resource_id uuid,
  p_time_range  tstzrange,
  p_company_id  uuid default null,
  p_addons      jsonb default '[]',
  p_notes       text default null,
  p_guest_name  text default null,
  p_guest_email text default null,
  p_guest_phone text default null,
  p_hold_only   boolean default false,
  p_hold_session_id text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource public.resources%rowtype;
  v_price    jsonb;
  v_booking  public.bookings;
  v_invoice  public.invoices;
  v_is_staff boolean := public.is_staff();
begin
  select * into v_resource from public.resources where id = p_resource_id;
  if not found then
    raise exception 'Resource not found' using errcode = 'no_data_found';
  end if;

  if not v_resource.is_bookable or v_resource.status <> 'available' then
    raise exception 'Resource % is not bookable (status: %)',
      v_resource.name, v_resource.status using errcode = 'check_violation';
  end if;

  -- Authorization. A member booking must name a company the caller may book
  -- for; a guest booking must supply contact details.
  if p_company_id is not null then
    if not (v_is_staff or public.has_company_perm(p_company_id, 'book_rooms')) then
      raise exception 'You do not have permission to book for this company'
        using errcode = 'insufficient_privilege';
    end if;
  elsif auth.uid() is not null and not v_is_staff then
    raise exception 'Select a company to book for'
      using errcode = 'insufficient_privilege';
  elsif coalesce(p_guest_email, '') = '' or coalesce(p_guest_name, '') = '' then
    raise exception 'Guest bookings require a name and email'
      using errcode = 'check_violation';
  end if;

  -- Blackouts: maintenance windows and private hire.
  if exists (
    select 1 from public.resource_blackouts b
    where (b.resource_id = p_resource_id or b.branch_id = v_resource.branch_id)
      and b.time_range && p_time_range
  ) then
    raise exception 'That time is unavailable for this resource'
      using errcode = 'check_violation';
  end if;

  -- Free any expired hold on this exact slot before pricing. Holds sit inside
  -- the exclusion constraint's predicate, so without this an abandoned
  -- checkout blocks the slot until the cron sweeper happens to run.
  delete from public.bookings
   where resource_id = p_resource_id
     and status = 'hold'
     and hold_expires_at < now()
     and time_range && p_time_range;

  -- Serialize credit accounting per company for the rest of this transaction.
  --
  -- price_booking reads credit_balance() and create_booking later writes the
  -- negative ledger row. Under READ COMMITTED two concurrent bookings each
  -- take their own snapshot, both see the same last hour available, and both
  -- spend it - the ledger goes negative and the hours are given away twice.
  -- The bookings exclusion constraint does not help: the two bookings are for
  -- different slots, so nothing arbitrates between them.
  --
  -- Taken AFTER the authorization checks so an unauthorized caller cannot
  -- force contention, and BEFORE the balance is read. Transaction-scoped, so
  -- it releases on commit or rollback.
  if p_company_id is not null then
    perform pg_advisory_xact_lock(hashtext('mars.credit:' || p_company_id::text));
  end if;

  v_price := public.price_booking(p_resource_id, p_time_range, p_company_id, p_addons);

  -- The insert is the arbiter. If two callers race for the same slot, the
  -- exclusion constraint raises 23P01 on the loser and the whole transaction
  -- rolls back - no credit consumed, no invoice raised.
  begin
    insert into public.bookings (
      resource_id, branch_id, company_id, booked_by,
      guest_name, guest_email, guest_phone,
      time_range, status, hold_expires_at, hold_session_id,
      credit_hours_used, billable_hours,
      subtotal, vat_amount, total, price_breakdown, notes
    ) values (
      p_resource_id, v_resource.branch_id, p_company_id, auth.uid(),
      p_guest_name, p_guest_email, p_guest_phone,
      p_time_range,
      case when p_hold_only then 'hold' else 'confirmed' end,
      case when p_hold_only then now() + interval '10 minutes' end,
      p_hold_session_id,
      -- A hold reserves the slot and nothing else: it debits no credit and
      -- raises no invoice. Persisting the priced figures on a hold row made
      -- cancel_booking refund credit that was never taken, which minted free
      -- hours on every hold/cancel cycle. The full quote is still kept in
      -- price_breakdown so the hold can be priced identically when confirmed.
      case when p_hold_only then 0 else (v_price ->> 'credit_hours_used')::numeric end,
      case when p_hold_only then 0 else (v_price ->> 'billable_hours')::numeric end,
      case when p_hold_only then 0 else (v_price ->> 'subtotal')::numeric end,
      case when p_hold_only then 0 else (v_price ->> 'vat_amount')::numeric end,
      case when p_hold_only then 0 else (v_price ->> 'total')::numeric end,
      v_price,
      p_notes
    )
    returning * into v_booking;
  exception
    when exclusion_violation then
      raise exception 'That slot has just been taken. Please choose another time.'
        using errcode = '23P01', hint = 'slot_taken';
  end;

  -- Add-ons, priced as at booking time.
  insert into public.booking_addons (booking_id, addon_id, quantity, unit_price, is_quote_only)
  select v_booking.id,
         a.id,
         coalesce((item ->> 'quantity')::int, 1),
         a.price,
         a.is_quote_only
  from jsonb_array_elements(coalesce(p_addons, '[]')) as item
  join public.addons a on a.id = (item ->> 'addon_id')::uuid
  where a.is_active;

  -- A hold reserves the slot but consumes nothing and bills nothing.
  if p_hold_only then
    return v_booking;
  end if;

  -- Consume credit.
  --
  -- Debited to the CURRENT period, which is the same one price_booking checked
  -- the balance against. Using the booking's own period here (as this did
  -- originally) meant a booking in a later month was validated against this
  -- month's balance and then debited from next month's - so the hours were
  -- spent twice in the current period and the future period went negative.
  --
  -- The product consequence is that booking ahead draws on today's allowance
  -- rather than the one that will be granted for the month of the booking.
  -- That is the predictable choice: the alternative bills advance bookings in
  -- full, because next month's allocation does not exist until the 1st.
  if v_booking.credit_hours_used > 0 then
    insert into public.credit_entries
      (company_id, profile_id, period, hours, reason, booking_id, note)
    values (
      p_company_id,
      auth.uid(),
      public.credit_period(),
      -v_booking.credit_hours_used,
      'booking',
      v_booking.id,
      'Booking ' || v_booking.reference
    );
  end if;

  -- Invoice the balance. A fully credit-covered booking with no add-ons
  -- produces no invoice, which is the point of the allowance.
  if p_company_id is not null and v_booking.total > 0 then
    insert into public.invoices (
      company_id, booking_id, kind, description, description_ar,
      due_date, subtotal, vat_amount, total, status
    ) values (
      p_company_id,
      v_booking.id,
      'booking',
      v_resource.name || ' — ' || to_char(lower(p_time_range) at time zone 'Asia/Riyadh',
                                          'DD Mon YYYY HH24:MI'),
      coalesce(v_resource.name_ar, v_resource.name),
      (lower(p_time_range) at time zone 'Asia/Riyadh')::date + 7,
      v_booking.subtotal,
      v_booking.vat_amount,
      v_booking.total,
      'unpaid'
    )
    returning * into v_invoice;
  end if;

  -- Notify the booker.
  if auth.uid() is not null then
    insert into public.notifications (profile_id, kind, title, title_ar, body, link)
    values (
      auth.uid(),
      'booking_confirmed',
      'Booking confirmed — ' || v_booking.reference,
      'تم تأكيد الحجز — ' || v_booking.reference,
      v_resource.name || ' · ' ||
        to_char(lower(p_time_range) at time zone 'Asia/Riyadh', 'DD Mon, HH24:MI'),
      '/bookings/' || v_booking.id
    );
  end if;

  return v_booking;
end;
$$;

grant execute on function public.create_booking(
  uuid, tstzrange, uuid, jsonb, text, text, text, text, boolean, text
) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- cancel_booking — refunds credit if it was consumed, voids the invoice.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason     text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  -- FOR UPDATE, not a bare select: two concurrent cancels would otherwise both
  -- read status 'confirmed', both pass the guard below, and both write a
  -- refund row - handing back the credit twice.
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'no_data_found';
  end if;

  if not (
    public.is_staff()
    or (v_booking.company_id is not null
        and public.has_company_perm(v_booking.company_id, 'book_rooms'))
  ) then
    raise exception 'You do not have permission to cancel this booking'
      using errcode = 'insufficient_privilege';
  end if;

  if v_booking.status in ('cancelled', 'completed') then
    raise exception 'Booking is already %', v_booking.status
      using errcode = 'check_violation';
  end if;

  update public.bookings
     set status = 'cancelled',
         hold_expires_at = null,
         cancelled_at = now(),
         cancelled_by = auth.uid(),
         cancellation_reason = p_reason
   where id = p_booking_id
   returning * into v_booking;

  -- Return consumed credit to whichever period it was actually taken from.
  --
  -- Derived from the ledger rather than from bookings.credit_hours_used. That
  -- column records what the booking was PRICED at, not what was DEBITED, and
  -- the two differ for a hold - which debits nothing. Refunding off the column
  -- let anyone hold a room and cancel it in a loop, minting free hours every
  -- cycle. Summing the actual 'booking' entries refunds exactly what was
  -- taken, is a no-op when nothing was, and cannot double-refund because the
  -- offsetting 'booking_refund' rows are excluded from the sum.
  insert into public.credit_entries
    (company_id, profile_id, period, hours, reason, booking_id, note)
  select v_booking.company_id,
         auth.uid(),
         ce.period,
         -sum(ce.hours),
         'booking_refund',
         v_booking.id,
         'Cancelled ' || v_booking.reference
    from public.credit_entries ce
   where ce.booking_id = v_booking.id
     and ce.reason = 'booking'
     and not exists (
       select 1 from public.credit_entries r
        where r.booking_id = ce.booking_id
          and r.reason = 'booking_refund'
     )
   group by ce.period
  having sum(ce.hours) < 0;

  update public.invoices
     set status = 'void'
   where booking_id = p_booking_id
     and status in ('draft', 'unpaid', 'overdue');

  return v_booking;
end;
$$;

grant execute on function public.cancel_booking(uuid, text) to authenticated;
