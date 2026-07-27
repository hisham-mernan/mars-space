# Mars Space — Spec vs. Implementation Gap Analysis

**Date:** 2026-07-27
**Repo:** `hisham-mernan/mars-space` @ `main` (640b360)
**Sources:**
- Doc 1 — *Master Software Specification (MSP) v1.0* (~130k chars)
- Doc 2 — *Design System / UI Specification* (~270k chars)
- Repo: 78 JS files, Next.js 16.2.10 / React 19.2.4, App Router

---

## 0. Headline finding — the build order is inverted

The repo has been built roughly **backwards relative to the spec's own phasing** (MSP "Final Recommendation: Development Phases").

| Spec phase | Contents | Built? |
|---|---|---|
| **Phase 1 — Public Platform (MVP)** | Marketing website, Authentication, Meeting room booking, Membership applications, Basic CMS, Payment gateway | **Largely missing** |
| **Phase 2 — Core ERP** | CRM, Membership mgmt, Booking engine, Contracts, Billing, Reception | Partial (CRM, Contracts, Billing UI) |
| **Phase 3 — Operations** | Facility, Maintenance, Inventory, Visitors, Assets | Inventory only (UI, unwired) |
| **Phase 4 — Community** | Events, Directory, Rewards, Networking | Events + Rewards pages (static) |
| **Phase 5 — Enterprise** | Multi-branch, Advanced reporting, **BI dashboards**, White-label, Mobile, **AI insights** | **BI + AI pages exist** |

Phase 5 deliverables (BI dashboards, AI insights) are present while Phase 1 blockers (real auth, payment gateway, CMS, the marketing site itself) are not. The most valuable next work is therefore *backfilling Phase 1*, not extending the ERP.

---

## 1. What matches the spec

These are genuinely aligned and should be kept.

### 1.1 Architecture & conventions
- **App Router + route groups** — `src/app` layout matches the spec's application split (`public` / `member` / `erp`).
- **Versioned API namespace** — `/api/v1/...` with `public` / `member` / `erp` segmentation matches MSP "API Standards".
- **Envelope response format** — routes return `{ success, data, error: { code, message } }`, matching MSP "Response Format".
- **Service/repository layering** — `src/services/*` (13 services) + `src/repositories/BaseRepository.js` matches MSP "Modular Backend Structure".
- **Event bus** — `src/core/events/EventBus.js` with `DOMAIN_EVENTS`, consumed by `ContractService` (`CONTRACT_ACTIVATED` → downstream automation). This directly implements MSP "Enterprise Recommendation: Event Bus & Workflow Engine" — a genuinely advanced match.
- **Audit logging** — `AuditLogService` exists, matching MSP "Audit & Activity Logging".

### 1.2 Domain modelling
- **VAT at 15%** correctly modelled: seed invoice `subtotal 440 + vat 66 = 506`; `ContractService` computes `monthlyFee * 0.15`. Matches MSP "Generate VAT invoices".
- **Booking conflict detection** — `src/lib/db.js:checkAvailability()` does real overlap detection against confirmed/checked-in bookings, validates resource status and start<end. This is correct, non-trivial logic.
- **Bilingual data model** — `nameAr`/`featuresAr` parallel fields in `db.json`; `translations.js` (24KB) with `LanguageContext` driving `lang`/`dir`. Matches MSP "Languages" (AR/EN, RTL).
- **Saudi payment methods** — checkout defaults to `Mada`, matching MSP's listed methods.

### 1.3 Design system
- Dark obsidian + copper palette, glassmorphism (`--glass-bg`, `backdrop-filter`), rounded/pill interface, motion tokens (`--ease-out`, `--dur-*`) — matches Doc 2 "Design Principles" (Spacious, Large Photography, Glassmorphism, Rounded, Motion).
- Header transparent→solid-on-scroll with blur — matches Doc 2 "Header Behavior" exactly.
- Design tokens centralised in `globals.css` `:root` — matches Doc 2 Volume 8 intent.
- **Typography now on Thmanyah Sans** (AR+EN single family) — pending branch `claude/thmanyahsans-font-change-wl8eyf`.

---

## 2. What does not match the spec

### 2.1 Public website — single-page site vs. multi-page architecture
**This is the largest structural divergence.**

Spec (MSP "Complete Website Sitemap" + Doc 2 "Website Structure") defines a multi-page marketing site. The repo implements a **one-page scroll landing page**: `src/components/Header.js` navigates to anchors (`#space`, `#explore`, `#offices`, `#membership`, `#community`, `#visit`), not routes.

| Spec page | Status |
|---|---|
| Home | Built (as scroll sections) |
| About Mars Space | **Missing** |
| Spaces → Private Offices | Partial (`/spaces`, `/spaces/[slug]`) |
| Spaces → Coworking, Dedicated Desks, Hot Desks, Focus Pods, Meeting Rooms, Community Space | **Missing** (6 subtypes) |
| Membership | **Missing** (anchor only) |
| Pricing | **Missing** |
| Events | **Missing** |
| Gallery | **Missing** |
| Blog | **Missing** |
| FAQ | **Missing** |
| Contact | **Missing** (API exists) |
| Book Meeting Room | **Missing** |
| Book Community Space | **Missing** |
| Login / Register | Built |

**10 of 14 top-level public pages are missing.**

Also missing from Doc 2's global layout: **Announcement Bar** (spec'd, absent), **Mega Menu** for Workspaces (spec'd, absent), **header Search** (spec'd, absent), **"Become a Member" CTA** (spec'd, absent).

### 2.2 Homepage sections
Doc 2 specifies 12 homepage sections; 7 exist.

| Spec section | Status |
|---|---|
| Hero | Built (`#top`) |
| Trust Section | **Missing** |
| Explore Mars Space | Built (`#explore`) |
| Why Mars Space | **Missing** |
| Featured Meeting Rooms | **Missing** — *API `/api/v1/public/meeting-rooms/featured` exists but is orphaned* |
| Membership Plans | Built (`#membership`) |
| Community & Events | Built (`#community`) |
| Gallery Preview | **Missing** |
| Testimonials | **Missing** |
| Interactive Branch Map | **Missing** |
| FAQ Preview | **Missing** — *API `/api/v1/public/faqs/featured` exists but is orphaned* |
| Final CTA | **Missing** |

The homepage (`src/app/page.js`, 849 lines) contains **zero `fetch()` calls** — all content is hardcoded, so the CMS-driven content model in MSP "Homepage CMS Fields" is unimplemented.

### 2.3 Member Portal — 7 of 16 sections missing
Spec sitemap vs. `src/app/member/`:

| Spec | Status |
|---|---|
| Dashboard, My Membership, My Bookings, Invoices, Support, Notifications, Community | Built (7) |
| Payments | Partial — `billing/` |
| Settings | Partial — `profile/` |
| **My Office** | **Missing** |
| **Meeting Rooms** | **Missing** |
| **Community Bookings** | **Missing** |
| **Contracts** | **Missing** |
| **Documents** | **Missing** |
| **Visitors** | **Missing** |
| **Calendar** | **Missing** |

Not in spec but built: `events/`, `rewards/` (these are Phase 4 items — fine, but ahead of schedule).

### 2.4 ERP — 18 of 26 modules missing
`src/app/erp/layout.js` registers **8 modules**. Spec requires 26.

Built: Dashboard, CRM, Contracts, Workspaces (≈Spaces), Inventory, Invoices, BI (≈Analytics), Reports.

**Missing:** Branches, Buildings, Floors, Resources, Members, Companies, Bookings, Payments, Sales, Maintenance, Cleaning, Assets, Parking, Events, Support, Employees, CMS, Settings.

Notably **Members** and **Companies** — core ERP entities — have no module at all, and **Bookings** has no ERP-side management screen despite the booking engine existing.

### 2.5 Admin CMS — entirely absent
MSP "Admin CMS Sitemap" defines 20 sections (Homepage, Hero, About, Gallery, Spaces, Meeting Rooms, Memberships, Pricing, FAQs, Blogs, Events, Testimonials, Partners, SEO, Menus, Footer, Media Library, Redirects, Analytics, Settings).

**There is no `/admin` route.** 0 of 20 built. This is a Phase 1 deliverable ("Basic CMS").

### 2.6 Infrastructure vs. MSP Chapter 14
| Spec | Repo |
|---|---|
| PostgreSQL | **JSON file** (`src/data/db.json`, 16KB) via `fs.readFileSync` |
| Redis cache | Absent |
| Object storage (S3) | Absent — assets in `public/` |
| Search service | In-memory filter in `SearchService.js` |
| Background jobs / queue | Absent |
| Notification queue (Email/SMS/WhatsApp/Push) | `NotificationService.js` (51 lines, no provider) |
| RBAC + permission matrix | **Absent** |
| Feature flags | Absent |

`src/lib/db.js` reads and rewrites a JSON file on every request. This is not concurrency-safe (read-modify-write races), will not survive horizontal scaling, and is wiped on container rebuild. It is fine as a prototype seam but is the single biggest blocker to production.

---

## 3. Incomplete / broken flows

### 3.1 Authentication — not implemented (security-critical)
`src/app/auth/login/page.js:27`:
```js
if (email === 'ahmed@example.com' && password === 'password') {
  localStorage.setItem('mars-user', JSON.stringify({ id: 'usr-01', ... }));
}
```
- Credentials **hardcoded in client-side source**.
- No auth API route exists at all (`src/app/api/` has no `auth/` segment).
- No session, JWT, cookie, or password hashing.
- **No `middleware.js`** — `/member/*` and `/erp/*` are fully publicly reachable. The entire ERP (financials, CRM, contracts) is accessible by URL with no check.
- `register/page.js:89` writes `localStorage` only — **no account is created**.
- `forgot-password/page.js` — **zero** `fetch()`; pure UI stub, no reset flow.

MSP Chapter 2 defines 15 roles and an RBAC permission matrix. **None** of it is enforced.

### 3.2 Payment — simulated, no gateway
`/api/v1/public/bookings/[id]/payment/route.js` flips `status → 'Confirmed'`, `paymentStatus → 'Paid'` and generates an invoice with `Math.random()`. There is no gateway call, no redirect, no webhook, no idempotency key, no signature verification. MSP requires Card / Apple Pay / Google Pay / Mada / STC Pay / Bank Transfer.

### 3.3 Orphaned APIs — built, never called
Verified by direct grep (excluding `src/app/api/`):

| Endpoint | Consumer |
|---|---|
| `/api/v1/public/faqs/featured` | **none** |
| `/api/v1/public/meeting-rooms/featured` | **none** |
| `/api/v1/member/support` | **none** — `member/support/page.js` has 0 `fetch()`; the form does not submit |
| `/api/v1/erp/inventory` | **none** — `erp/inventory/page.js` has 0 `fetch()` |
| `/api/v1/erp/workspaces` | **none** — ERP workspace pages call `/api/v1/public/workspaces` instead |

Additionally `faqs: []` and `events: []` are **empty** in `db.json`, so the FAQ and Events APIs would return nothing even once wired.

### 3.4 Static pages — UI without data
11 of 21 member/ERP pages contain **zero** `fetch()` calls and render hardcoded content: `member/{support, rewards, profile, notifications, membership, events, community, billing}`, `erp/{reports, invoices, inventory, bi/ai}`.

### 3.5 Cross-layer smell
`member/invoices/page.js:23` and `member/bookings/page.js:28` both fetch **`/api/v1/public/homepage`** to populate member data. A member screen sourcing from a public marketing endpoint will break as soon as that endpoint is scoped to CMS content.

### 3.6 Multi-branch unimplemented
`db.json` has 2 branches; MSP "Supported Branches" and Doc 2 "Interactive Branch Map" require branch selection. There is **no branch selector** anywhere in the UI and no branch filter in any query.

---

## 4. Plan to update the repo

Ordered to match the spec's own phasing and to unblock the highest-risk items first.

### Phase 0 — Foundations (blocking; ~1–2 weeks)
1. **Replace the JSON store with PostgreSQL.** Introduce Prisma/Drizzle; port `BaseRepository` to it. Model the MSP "Database Model (Core)" tables — `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `audit_logs`, `feature_flags` — plus the existing domain entities. Keep `db.json` as the seed fixture.
2. **Implement real authentication.** Add `/api/v1/auth/{login,register,logout,refresh,forgot-password,reset-password}`; hash with argon2/bcrypt; issue httpOnly cookie sessions or JWT+refresh.
3. **Add `src/middleware.js`** to gate `/member/*` and `/erp/*`, with role checks. *Nothing else should ship before this — the ERP is currently world-readable.*
4. **Implement RBAC** from MSP Chapter 2: seed the 15 roles and the permission matrix, enforce server-side in route handlers (not just UI hiding).

### Phase 1 — Complete the public platform (MVP)
5. **Convert the landing page to a multi-page site.** Replace anchor nav with routes; build the 10 missing pages (About, Membership, Pricing, Events, Gallery, Blog, FAQ, Contact, Book Meeting Room, Book Community Space) and the 6 Spaces subtype pages.
6. **Complete the homepage** — add the 5 missing sections and wire the 2 orphaned APIs (`meeting-rooms/featured`, `faqs/featured`); seed `faqs` and `events`.
7. **Add Announcement Bar, Mega Menu, header Search, "Become a Member" CTA** per Doc 2.
8. **Integrate a real payment gateway** (Moyasar or Tap for Mada/Apple Pay/STC Pay): hosted-checkout redirect, webhook handler with signature verification, idempotency keys, and a proper `payments` table. Retire the simulated route.
9. **Build the Admin CMS** (`/admin`) — at minimum Homepage/Hero/FAQs/Events/Testimonials/Media so marketing content stops being hardcoded.

### Phase 2 — Close ERP and member gaps
10. **Wire the static pages.** Connect the 11 fetch-less pages; make the support form actually POST to `/api/v1/member/support`; point ERP workspace pages at `/api/v1/erp/workspaces`; stop member pages reading `/api/v1/public/homepage`.
11. **Add the 7 missing member sections** — prioritise Contracts, Documents, Meeting Rooms, Calendar (highest member value).
12. **Add core missing ERP modules** — Members, Companies, Bookings, Payments first; then Branches/Buildings/Floors/Resources.

### Phase 3+ — Operations, community, scale
13. Maintenance, Cleaning, Assets, Parking, Visitor management.
14. Multi-branch: branch selector, branch-scoped queries, Interactive Branch Map.
15. Notification providers (email/SMS/WhatsApp) behind `NotificationService`, with a queue.
16. Redis cache, object storage, background jobs, feature flags.

### Cross-cutting
- **Testing** — there is currently no test infrastructure at all. MSP Chapter 14 requires unit/integration/E2E/performance tests. Add Vitest + Playwright early; Playwright is already available in this environment.
- **Lint debt** — `npm run lint` reports 71 problems (46 errors) on `main`, mostly `react-hooks/set-state-in-effect`. Worth a dedicated cleanup pass.
- **Design tokens** — extract Doc 2 Volume 8 tokens (typography scale, spacing, radius, shadows) into `globals.css` so components stop hardcoding inline styles. The heavy inline-style usage is what made the font change hard in the first place.

---

## 5. Quick reference — counts

| Area | Spec | Built | Gap |
|---|---|---|---|
| Public pages | 14 | 4 | **10** |
| Homepage sections | 12 | 7 | **5** |
| Member portal sections | 16 | 9 | **7** |
| ERP modules | 26 | 8 | **18** |
| Admin CMS sections | 20 | 0 | **20** |
| Orphaned APIs | — | 5 | 5 |
| Fetch-less member/ERP pages | — | 11 | 11 |
