# Demo floor

Fills the second floor so the UI can be judged at real density rather than
against one company and two bookings.

    25 companies, every office let, 83/83 desks
    80 people with bilingual names, job titles and avatars
    143 meeting-room bookings across past, present and future
    75 invoices (paid, unpaid, overdue), 24 repairs, 7 community events
    2 community-space requests — one awaiting a quote, one quoted

## Removing it

    npx supabase db query --linked --file supabase/demo/demo_seed_rollback.sql

Every generated row uses a reserved uuid family, so the rollback deletes exactly
what was inserted and cannot match a real row:

| prefix | rows |
|---|---|
| `dc…` | companies |
| `dd…` | contracts |
| `de…` | office assignments |
| `df…` | profiles (and their `auth.users` rows, which cascade) |
| `db…` | invoices |
| `e1…` | repair requests |
| `e2…` | events |

Two things the rollback deliberately does not undo, because they are
improvements rather than demo data: the real account's profile now has a proper
name instead of the email local-part the signup trigger derived, and the shared
tenant on office-01 is named Thmanyah Digital instead of "DEMO — TechCorp KSA".

## Regenerating

    python supabase/demo/demo.py     # roster -> demo_data.json
    python supabase/demo/emit.py     # -> demo_seed.sql + rollback
    python supabase/demo/upload.py   # logos and avatars -> Storage

The generator is seeded with a fixed value, so re-running produces the same
floor and the same ids. Change the seed only if you want a different floor.

## Why the addresses look odd

Every seeded person is `first.last@demo.mars.sa` — a subdomain Mars Space owns
and has not created, so it cannot receive mail. Seeding plausible addresses at
real domains is how a demo dataset ends up emailing strangers the first time
someone tests a notification.

## Images

Generated monograms, not photographs: a fake company logo or a stock headshot
would misrepresent a real business and a real person. Room photography is the
real Mars Space set from `public/assets`, uploaded to Storage so the website and
the mobile app resolve one absolute URL instead of a website-relative path the
app cannot follow.

    company-logos/<company_id>/logo.png
    avatars/<profile_id>/avatar.png
    resource-photos/<filename>.jpg
