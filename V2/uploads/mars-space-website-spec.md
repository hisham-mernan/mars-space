# Mars Space — Website Specification

**Version** 1.0 · **Date** July 2026 · **Prepared against** Mars Brand Guideline 2026
**Product** Mars Space — coworking space, private offices and meeting rooms, Saudi Arabia
**Parent brand** Mars Ventures (Mars Space sits alongside Mars Lab, Mars VC, Mars Consultancy)

---

## Contents

1. [Scope and assumptions](#1-scope-and-assumptions)
2. [Brand application](#2-brand-application)
3. [Art direction and design style](#3-art-direction-and-design-style)
4. [Motion system](#4-motion-system)
5. [Bilingual and RTL requirements](#5-bilingual-and-rtl-requirements)
6. [Sitemap and information architecture](#6-sitemap-and-information-architecture)
7. [Page specifications](#7-page-specifications)
8. [Booking engine specification](#8-booking-engine-specification)
9. [Member portal — Phase 2 outline](#9-member-portal--phase-2-outline)
10. [Component library](#10-component-library)
11. [Technical architecture and integrations](#11-technical-architecture-and-integrations)
12. [Accessibility and performance targets](#12-accessibility-and-performance-targets)
13. [SEO and analytics](#13-seo-and-analytics)
14. [Assets and content required from Mars](#14-assets-and-content-required-from-mars)
15. [Phasing](#15-phasing)
16. [Open decisions](#16-open-decisions)

---

## 1. Scope and assumptions

### 1.1 What this document covers

The **public, visitor-facing website** for Mars Space: design style, page structure, and content. It also specifies the **booking engine** in enough detail to build against, because meeting-room booking is a public function, not a member-only one — a visitor with no account must be able to complete a booking end to end.

The **member portal** is outlined at the level needed so the public site's sign-up and account flows connect cleanly into it. The **ERP** (contracts, offices, invoicing, occupancy) is out of scope here, but §11 marks the integration seams so the website does not have to be rebuilt when the ERP arrives.

### 1.2 The space (as briefed)

One floor, six zone types:

| Zone | Bookable | Booking model |
|---|---|---|
| Private offices | Yes | Contract / monthly, enquiry-led |
| Coworking desks (hot + dedicated) | Yes | Day pass or membership |
| Meeting rooms | Yes | **Hourly, public, instant** |
| Focus pods (single-person private rooms) | Yes | Hourly, instant |
| Community space (events, courses) | Yes | Hourly / half-day, **hybrid** (see §8.6) |
| Café and lounge | No | Open access, amenity |

### 1.3 Assumptions I have made

These are written into the spec. Correct any that are wrong and the affected sections change, not the whole document.

1. **Location: Jeddah.** All location copy, map, and directions content assume a Jeddah address. Swap the city if the space is elsewhere.
2. **Currency SAR, VAT 15%** applies to all bookings and memberships.
3. **Working week Sunday–Thursday.** Friday–Saturday treated as weekend for rate rules and opening hours.
4. **Mars Space is a sub-brand, not a separate brand.** It uses the Mars logotype with a "Space" descriptor per the guideline's Products and Services page.
5. **Bilingual Arabic / English is mandatory,** Arabic as the primary market language.
6. **Photography does not exist yet.** §14 includes a shot list built for this design direction. Until the shoot happens, the site cannot launch — the design depends heavily on photography.
7. **Pricing is not set.** All rates appear as placeholders (`[SAR ___ / hr]`). The page structures assume a three-tier rate card (hourly / half-day / full-day) per bookable resource.

---

## 2. Brand application

Everything in this section derives from the Mars Brand Guideline 2026. Where the guideline is silent (UI state colours, form styling, tints for dark surfaces), I extend it and mark the extension explicitly.

### 2.1 Sub-brand lockup

Per the guideline's Products and Services rule: the core `MARS` logotype paired with a smaller descriptor set in IBM Plex Sans Arabic, master brand dominant.

```
MARS Space          ← primary lockup, descriptor at ~28% of logotype cap height,
                      baseline-aligned to logotype baseline, optical gap = 0.25 × M-width
```

- **Header:** `MARS Space` in the full lockup (Arabic + English stacked) on the desktop header; English-only lockup on mobile where vertical space is tight.
- **Favicon / app icon / social avatar:** the Icon Logo variant (rounded-square, dark) exactly as drawn in the guideline. Do not create a new icon.
- **Clear space:** the height of the letter M on all four sides. In CSS this becomes a fixed padding on the logo component — do not let flexbox gaps eat it.
- **Minimum size:** 90px wide for the full lockup on screen. Below 90px, switch to the English-only or icon variant. This is why the mobile header uses a different variant, not a scaled-down one.
- **Never** rotate, distort, recolour, skew, or restack the logo. The Arabic sits above the English, always.

**Open decision:** the Arabic form of the descriptor. Options are `مارس سبيس` (transliteration, matches how Saudi tech sub-brands usually handle this) or leaving `Space` in Latin inside Arabic layouts. My recommendation is `مارس سبيس` for the Arabic lockup — see §16.

### 2.2 Colour

**Brand palette (from guideline — do not alter):**

| Token | Hex | Role |
|---|---|---|
| `--mars-void` | `#0B0B0F` | Primary dark surface. Hero, footer, brand sections. |
| `--mars-slate` | `#1E1E24` | Elevated dark surface. Cards, nav bar on scroll, inputs on dark. |
| `--mars-paper` | `#F5F5F5` | Primary light surface. Photography sections, booking UI, forms. |
| `--mars-copper` | `#8A4120` | Accent. Rules, active states, primary button fill. |

**Critical contrast finding.** `#8A4120` on `#0B0B0F` measures approximately **2.7:1**. That fails WCAG AA for text (4.5:1) and fails even the 3:1 minimum for interactive component boundaries. This has three consequences the build must respect:

- Copper is **never a text colour on dark surfaces.**
- Copper **is** excellent as a fill with white text — `#FFFFFF` on `#8A4120` measures ~7.4:1.
- Copper **is** a valid text colour on `--mars-paper` — ~6.7:1, passes AA.

The guideline itself uses copper this way: as the thin horizontal rule on light section footers, never as body text on black. The design direction follows that lead.

**Extension tokens (mine, not in the guideline).** These are UI colours, not logo colours — extending the interface palette does not violate the "Don't Recolor" rule, which governs the logo mark.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--copper-400` | `#C86B3C` | Copper as **text or icon on dark surfaces**. A tint of brand copper. | 5.3:1 on `--mars-void` — AA. **On `--mars-slate` it drops to 4.4:1** — large text and icons only. |
| `--copper-900` | `#5C2B15` | Pressed / active state of copper buttons | — |
| `--surface-2` | `#26262E` | Second elevation on dark (hover on `--mars-slate` cards) | — |
| `--line-dark` | `rgba(245,245,245,0.10)` | Hairline dividers on dark | — |
| `--line-light` | `rgba(11,11,15,0.10)` | Hairline dividers on light | — |
| `--text-muted-dark` | `#8E8E96` | Secondary text on dark | 6.0:1 on `--mars-void` — AA |
| `--text-muted-light` | `#5A5A62` | Secondary text on light | 6.3:1 on `--mars-paper` — AA |

**Booking-state colours.** A booking calendar needs states the four-colour palette cannot express. These are functional, deliberately desaturated so they never compete with copper, and each is paired with a text label or pattern so the meaning does not rely on colour alone:

| State | Fill | Treatment |
|---|---|---|
| Available | `--mars-paper` + 1px `--line-light` | Copper border on hover |
| Selected | `--mars-copper` | White text |
| Held (in someone's checkout) | `#EAEAEA` | 45° hairline hatch + "On hold" |
| Booked | `#DCDCDC` | Solid, non-interactive, "Booked" |
| Your booking | `--mars-paper` + 2px `--mars-copper` | "Yours" chip |
| Closed / outside hours | transparent | Struck-through, disabled |
| Buffer (turnover) | `#EFEFEF` | 6px diagonal stripe, no label |

### 2.3 Typography

**IBM Plex Sans Arabic** for both scripts, per the guideline. This is the right call and worth stating why: it carries Latin and Arabic in one family, so the bilingual site keeps identical rhythm, weight, and colour across languages without a second licence or a fallback stack that shifts on language toggle. It is available on Google Fonts as a variable font — self-host the woff2 subsets rather than hotlinking, for performance and for reliability inside Saudi networks.

Weights available and how this site uses them:

| Weight | Used for |
|---|---|
| Thin 100 | Not used — fails legibility below 32px |
| ExtraLight 200 | Hero display type at ≥64px only |
| Light 300 | Large section headings on dark |
| Regular 400 | Body copy, form inputs |
| Medium 500 | Labels, table headers, nav, chips |
| SemiBold 600 | Sub-headings, card titles, buttons |
| Bold 700 | Prices, numerals, availability figures — used sparingly |

**Type scale** (1.25 ratio, 16px base, `clamp()` for fluid sizing):

| Role | Desktop | Mobile | Weight | Tracking | Line height |
|---|---|---|---|---|---|
| Display | 96px | 44px | 200 | −0.03em | 1.02 |
| H1 | 64px | 36px | 300 | −0.02em | 1.08 |
| H2 | 40px | 28px | 300 | −0.015em | 1.15 |
| H3 | 28px | 22px | 600 | −0.01em | 1.25 |
| Body L | 20px | 18px | 400 | 0 | 1.6 |
| Body | 16px | 16px | 400 | 0 | 1.65 |
| Caption | 14px | 13px | 500 | 0.01em | 1.5 |
| Eyebrow | 12px | 12px | 500 | **0.16em**, uppercase | 1.4 |
| Numeral / price | 32px | 24px | 700 | −0.01em | 1.1 |

**Arabic adjustments.** Arabic needs more vertical room and does not use uppercase or letter-spacing:

- Arabic line height: **+0.15** over the Latin value at every step.
- Arabic eyebrows: no uppercase transform, no letter-spacing. Use weight 500 and a copper rule instead to carry the same emphasis.
- Arabic display weights: step **one weight heavier** than Latin (ExtraLight → Light at display size). Arabic letterforms have thinner natural strokes and go optically weak at 200.
- Arabic headline sizes: **−8%** relative to Latin at the same hierarchy level, so the two languages read at the same visual weight.

**Numerals.** Use Latin digits (0–9) throughout, in both languages, including in Arabic layouts. This is standard commercial practice in Saudi Arabia for prices, times, and phone numbers, and it removes any ambiguity in the booking calendar.

### 2.4 Tone of voice in the interface

The guideline is explicit: strategic and visionary, confident and decisive, data-driven and precise. Not playful, not emotionally excessive, not hype-driven. Applied to microcopy that means **plain, specific, and slightly understated** — the interface never sells, it states.

| Context | On brand | Off brand |
|---|---|---|
| Primary CTA | `Book a room` | `Let's find your perfect space!` |
| Availability | `3 rooms available Sunday` | `Lots of great options open!` |
| Empty search result | `No rooms free at that time. The nearest opening is 14:00.` | `Oops! Nothing here 😔` |
| Booking confirmed | `Booked. Room 3, Sunday 10:00–12:00.` | `Woohoo — you're all set!` |
| Payment error | `Card declined. Try another card or pay by bank transfer.` | `Something went wrong. Please try again.` |
| Membership page | `Choose how you work.` | `Unleash your potential!` |
| Hold expiry | `Your slot is held for 9:42.` | `Hurry! Your spot is disappearing!` |

Two rules that flow from the brand personality "composed under pressure":

- **No urgency theatre.** No fake scarcity, no countdown pressure beyond the functional hold timer, no "only 2 left!" badges. Real availability is stated plainly; the numbers do the persuading.
- **Errors do not apologise.** They say what happened and what to do next.

---

## 3. Art direction and design style

### 3.1 The governing idea

The guideline describes the Mars mark as standing with **"quiet authority."** That phrase is the whole design direction. Mars Space is not a bright, jolly, bean-bag coworking brand. It is a disciplined operator's floor, presented the way a venture builder presents itself: dark, precise, generous with space, restrained with ornament, and completely unambiguous about facts — what a room holds, when it is free, what it costs.

Everything below serves that. Where a decision could go either way, it goes toward restraint.

### 3.2 Dark-and-light rhythm

The parent brand is near-black. A coworking site is photography-led, and photography of an interior wants light around it. Rather than fighting that, the site alternates:

```
┌─────────────────────────────────────┐
│ VOID  #0B0B0F   Hero                │  brand voice
├─────────────────────────────────────┤
│ PAPER #F5F5F5   Quick-book bar      │  utility
├─────────────────────────────────────┤
│ VOID  #0B0B0F   The Floor           │  signature moment
├─────────────────────────────────────┤
│ PAPER #F5F5F5   Six zones + photos  │  product
├─────────────────────────────────────┤
│ VOID  #0B0B0F   Membership          │  commercial
├─────────────────────────────────────┤
│ PAPER #F5F5F5   Community + events  │  product
├─────────────────────────────────────┤
│ SLATE #1E1E24   Mars ecosystem      │  brand architecture
├─────────────────────────────────────┤
│ VOID  #0B0B0F   Footer              │
└─────────────────────────────────────┘
```

The rule: **brand and commercial content on dark, product and utility content on light.** Booking interfaces, forms, room detail, pricing tables, and the member portal are always on `--mars-paper`. A dark booking calendar looks impressive and performs badly — people scanning a grid of time slots need maximum legibility, and light surfaces with hairline structure give it.

Every dark→light transition uses the copper hairline rule already established in the guideline's page footers: a 1px `--mars-copper` line, full-bleed, with the section label sitting right-aligned above it in caption size. This is directly lifted from the guideline pages and gives the site an immediate family resemblance to the brand book.

### 3.3 Layout

- **Grid:** 12 columns, 96px max gutter, container max-width **1440px**, side margin `clamp(24px, 5vw, 96px)`.
- **Spacing scale:** 4px base — `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192`. Section vertical padding is `128px` desktop / `72px` mobile, with signature sections at `192px`.
- **Radius:** `4px` on inputs and chips, `8px` on cards, `20px` on the icon-logo-derived rounded square, **999px on primary buttons** (the pill button is already established on the Mars Ventures site — reuse it, don't invent a new button shape).
- **Asymmetry as a device.** Content sits on a 7/5 or 5/7 split rather than centred, matching the guideline's own page layouts (logo left, content offset right, footer rule running full width to a right-aligned label). Centred layouts appear only in the hero and the confirmation screen.
- **Hairlines everywhere.** 1px rules at 10% opacity are the primary structural device, not borders, shadows, or filled boxes. The guideline is built on hairlines; the site should be too. Elevation on dark comes from `--surface-2`, never from drop shadow.

### 3.4 The signature element: the live floor

**This is the one thing the site should be remembered for, and it is the one place to spend boldness.**

Mars Space is a single floor. That is unusually easy to represent honestly — most coworking sites can't, because they're spread across buildings. So the centrepiece of the site is an **interactive plan of the actual floor** that shows real state:

- A schematic top-down plan of the floor, drawn as line art in `--copper-400` hairlines on `--mars-void` — not a photorealistic render, not an isometric cartoon. A drafting drawing. It should look like an architect's plan, because that is on-brand for a company whose tagline is "Structuring the Future."
- Each zone is a hotspot. Hovering lifts the zone's fill to 8% copper and surfaces a label: zone name, capacity, and **live status** — `4 desks free`, `Room 2 free until 15:00`, `Booked until 12:00`.
- Clicking a zone opens a panel with photography, the amenity list, and the relevant CTA (`Book`, `Enquire`, `See plans`).
- The plan is the site's navigation for the whole "what's here" story. It replaces a generic "Our Spaces" card grid as the primary route.
- On mobile it degrades to a **vertical scroll-linked version**: the plan is fixed, and as the user scrolls, each zone highlights in sequence with its panel below. Not a pinch-zoom map — those are unusable at 380px.

Fallback: if live occupancy data isn't available at launch, the plan ships with **meeting-room availability only** (which comes from the booking engine and exists from day one) and desk counts arrive in Phase 2 when access control is integrated. Do not fake live data.

### 3.5 Photography direction

The photography carries the whole product story, and the brand's darkness makes it easy to get wrong. Direction:

- **Low-key, warm.** Shoot at golden hour and after dark with interior lighting on. Warm practicals (2700–3000K) read as copper against the cool architecture and tie the images to `--mars-copper` without any filter or colour grade that would look artificial.
- **Architectural, not lifestyle.** Wide, level, straight-on or one-point perspective. Rooms mostly empty or with one or two people working quietly. No group high-fives, no laughing over laptops, no stock-photo body language.
- **Real, not staged.** Actual chairs, actual cable management, actual screens showing something plausible. The brand's "data-driven and precise" personality collapses instantly if the imagery looks styled.
- **Consistent crop family:** 3:2 for room heroes, 4:5 for the zone cards, 21:9 for full-bleed section breaks.
- **Treatment:** no duotone, no heavy grade, no overlay gradient beyond a subtle bottom scrim where text must sit over an image. Let the photography be the only place on the site with full colour.

### 3.6 Iconography

Thin line icons, 1.5px stroke, 24px grid, square caps. Amenity icons (screen, whiteboard, video conferencing, capacity, power, natural light, accessibility) are the main use, and they always appear **with a text label**, never alone. Custom-draw the amenity set to match the logotype's geometry — the Mars logotype has a distinct squared-off, constant-width, extended letterform, and a generic icon library will fight it.

### 3.7 What this design direction deliberately avoids

Stated so the design team doesn't reintroduce them: gradient mesh backgrounds, glassmorphism, floating 3D blobs, purple-to-blue accents, badge clusters, testimonial carousels with star ratings, emoji, exclamation marks, and "AI-powered" language. Also avoided: the space/planet imagery from the parent brand's hero. Mars Ventures earns the astronomical metaphor. Mars Space is a building in Jeddah — leaning on rockets and planets here would read as decoration rather than meaning.

---

## 4. Motion system

The brief asks for every section to be animated and interactive. That is the right instinct, and it needs one qualification to stay on brand: the guideline's personality is **"composed under pressure"** and explicitly not "emotionally excessive." So the motion system is generous in the marketing sections and near-silent in the booking flow.

### 4.1 Tokens

```css
--dur-instant: 120ms;   /* state feedback: hover, focus, toggle */
--dur-fast:    220ms;   /* small element entry, chips, tooltips */
--dur-base:    380ms;   /* section reveals, panel open */
--dur-slow:    700ms;   /* hero sequence, floor plan draw-on */

--ease-out:    cubic-bezier(0.16, 1, 0.30, 1);   /* default — decisive arrival */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* movement between two states */
--ease-linear: linear;                            /* marquees, progress only */
```

No spring, no bounce, no overshoot anywhere on the site. Overshoot reads as playful; the brand is not.

### 4.2 Named patterns

| Pattern | Where | Spec |
|---|---|---|
| **Hero sequence** | Home load | Logotype fades in (`--dur-base`), headline lines rise 24px with 80ms stagger, hairline rule draws left→right over `--dur-slow`, quick-book bar fades last. Full sequence ≤1.4s and skippable by scroll. |
| **Reveal-up** | Every marketing section | `opacity 0→1`, `translateY 32px→0`, `--dur-base`, `--ease-out`, IntersectionObserver at 15% visibility, fires **once**. |
| **Stagger** | Card grids, lists | Reveal-up with 60ms increment, capped at 6 items so the last card never lags. |
| **Plan draw-on** | Floor plan, first view | Zone outlines stroke-dash animate over `--dur-slow` in sequence, then status labels fade in. This is the site's one theatrical moment. |
| **Counter** | Stats (desks, rooms, m²) | Count from 0 over `--dur-slow`, `--ease-out`, once. |
| **Hover lift** | Cards | `translateY -4px` + background to `--surface-2`, `--dur-instant`. No scale, no shadow. |
| **Copper wipe** | Primary buttons | On hover, a copper fill wipes in from the leading edge (left in LTR, right in RTL) over `--dur-fast`. |
| **Image reveal** | Photography | Image scales `1.06→1` under a clipping mask that opens vertically, `--dur-slow`. Only on section-hero images, max one per viewport. |
| **Parallax** | Full-bleed section breaks | Background moves at 0.85× scroll speed. Maximum 24px total displacement. Never on text. |
| **Ecosystem marquee** | Mars family band | Continuous horizontal scroll of `MARS Ventures / MARS Lab / MARS VC / MARS Consultancy / MARS Space`, mirroring the marquee already on the Mars Ventures homepage. Pauses on hover. |
| **Language morph** | AR/EN toggle | Content cross-fades over `--dur-fast` while direction flips. Do not animate the layout mirroring itself — it looks broken. |

### 4.3 Where the site deliberately does not animate

This is a specification, not an omission:

- **The booking calendar and slot picker.** State changes are `--dur-instant` only. Nothing reveals on scroll, nothing staggers. Someone comparing 40 time slots needs the grid stable and instantly readable.
- **Checkout, payment, and forms.** No entrance animation. Field validation appears instantly.
- **The member portal.** Utility software. Transitions only, no choreography.
- **Anything above the fold after first load.** Returning visitors should not sit through the hero sequence again — set a session flag.
- **Price and availability numbers.** They never count up or shimmer. They appear.

### 4.4 Constraints

- **`prefers-reduced-motion: reduce`** disables all transform and opacity choreography; content appears in final state. Parallax, marquee, and the plan draw-on are fully disabled, not merely shortened.
- **No scroll hijacking.** No custom scroll speed, no snap-to-section on the marketing pages, no locked scroll during animation. Optional: Lenis for smoothing, and only if it degrades cleanly.
- **Animation budget:** total JS for motion ≤40KB gzipped. Prefer CSS and the Web Animations API; reach for a library only for the floor plan and the hero sequence.
- **Everything animated is visible without JS.** Reveal-up must be applied by script, so the base CSS state is `opacity: 1`. If the script fails, the page is readable, not blank.

---

## 5. Bilingual and RTL requirements

Arabic is not a translation layer bolted on at the end. Build it in from the first component.

- **Full mirroring.** `dir="rtl"` on `<html>`, and all layout CSS uses **logical properties** — `margin-inline-start`, `padding-inline-end`, `border-inline-start`, `inset-inline`. No `left`/`right` in layout CSS anywhere.
- **Direction-aware icons.** Arrows, chevrons, back buttons, progress indicators, and the copper button wipe all flip. Clocks, calendars, play buttons, and logos do not.
- **Routing:** `/ar/...` and `/en/...` path prefixes, with `hreflang` alternates and a self-referencing canonical on each. Default to Arabic for Saudi IPs, remember the choice in a cookie, and always keep the toggle visible in the header.
- **Language toggle** stays on the same page when switched, never dumps to the homepage.
- **Arabic typography** per §2.3 — heavier weights, more leading, no uppercase, no letter-spacing.
- **Dates:** Gregorian by default with an optional Hijri display toggle in the booking calendar. Store everything in UTC, render in `Asia/Riyadh` (UTC+3, no DST).
- **Times:** 12-hour with AM/PM in English, 12-hour with `ص`/`م` in Arabic.
- **Mixed-script strings.** Prices like `SAR 250` and times like `10:00` inside Arabic sentences need explicit bidi isolation (`<bdi>` or `unicode-bidi: isolate`) or they will render in the wrong order. This is the single most common bug on Saudi bilingual sites — write it into the QA checklist.
- **Forms:** Arabic labels, Latin-digit inputs, `inputmode="numeric"` on phone and card fields, and phone fields that accept `+966`, `05...`, and `9665...` formats interchangeably.
- **Content parity.** Every page, room description, amenity, and policy exists in both languages. No English-only fallbacks in the booking flow — a visitor must be able to complete a paid booking entirely in Arabic.

---

## 6. Sitemap and information architecture

```
/                              Home
│
├── /space                     The Space — interactive floor plan (hub)
│   ├── /space/private-offices
│   ├── /space/coworking
│   ├── /space/meeting-rooms   → also the booking index
│   ├── /space/focus-pods
│   ├── /space/community
│   └── /space/cafe
│
├── /meeting-rooms             Booking index — filter by date, time, capacity
│   └── /meeting-rooms/[slug]  Room detail + availability + book
│
├── /community-space           Events venue — detail + booking / enquiry
│
├── /membership                Plans and pricing
│   └── /membership/apply      Membership application (→ contract)
│
├── /gallery                   Full photo library, filterable by zone
├── /events                    What's happening on the floor
├── /about                     Mars Space + the Mars ecosystem
├── /contact                   Location, directions, hours, form
│
├── /book                      Booking flow (multi-step, non-indexed)
│   └── /book/confirmation/[ref]
│
├── /account                   Member portal (Phase 2, gated)
│   ├── /account/bookings
│   ├── /account/contract
│   ├── /account/invoices
│   ├── /account/team
│   └── /account/profile
│
├── /login  /signup  /forgot-password
│
└── /legal/terms · /legal/privacy · /legal/booking-policy · /legal/house-rules
```

### 6.1 Navigation

**Header** (sticky, transparent over hero, solidifies to `--mars-slate` with a hairline on scroll):

```
[MARS Space]   The Space   Meeting Rooms   Community   Membership   About   Contact   [ AR | EN ]   [Book a room]
```

- `Book a room` is a copper pill button, present in the header on every page including mobile. It is the site's single most important control.
- `The Space` opens a mega-menu on desktop containing the six zones with thumbnail, capacity, and a one-line description.
- Mobile: full-screen overlay menu, `Book a room` pinned to the bottom of the overlay.
- Once logged in, `[Book a room]` is joined by an account avatar; the CTA does not disappear.

**Footer** (on `--mars-void`, copper hairline above):

Four columns — Space / Book / Company / Legal — plus the full Mars lockup, address with a maps link, phone, email, WhatsApp, opening hours, social, VAT registration number and CR number (required for commercial credibility in Saudi Arabia), and a compact language toggle.

---

## 7. Page specifications

Copy below is **draft, ready to use**. English and Arabic are given for every headline and key CTA. Placeholders in `[brackets]` need real numbers from Mars.

---

### 7.1 Home

**Job of this page:** convince a visitor in fifteen seconds that this is a serious floor run by serious people, and get them into a meeting-room booking or a membership enquiry without a detour.

#### Section 1 — Hero · `--mars-void`

| | |
|---|---|
| Eyebrow | `MARS SPACE — JEDDAH` / `مارس سبيس — جدة` |
| Display | **Built for people who build.** / **مصمَّمة لمن يبني.** |
| Sub | Private offices, meeting rooms and a community floor — operated with the discipline of a venture builder. |
| Sub (AR) | مكاتب خاصة، وقاعات اجتماعات، ومساحة مجتمعية — تُدار بانضباط شركة لبناء المشاريع. |
| Primary CTA | `Book a room` / `احجز قاعة` — copper pill |
| Secondary CTA | `See the floor` / `استعرض الطابق` — ghost, scrolls to the plan |

**Alternate headlines** if the team prefers a different register:

- `One floor. Everything the work needs.` / `طابق واحد. كل ما يحتاجه العمل.`
- `Where the work gets done.` / `حيث يُنجز العمل.` — deliberately parallel to Mars Ventures' "Where ventures get built"

**Visual:** full-bleed 21:9 photograph of the floor shot after dark, warm interior lighting, one person at a desk in the mid-ground. Bottom scrim at 60% `--mars-void` so the type holds. **Not** a space/planet image — see §3.7.
**Motion:** hero sequence per §4.2. Hairline rule draws under the sub-headline.

#### Section 2 — Quick-book bar · `--mars-paper`

Sits directly under the hero, overlapping it by 48px so it reads as the page's first action. Fields in a single row on desktop, stacked on mobile:

```
[ Date ▾ ]  [ From ▾ ]  [ Duration ▾ ]  [ People ▾ ]   [ Check availability ]
```

- Defaults: today, next full hour, 1 hour, 4 people.
- Below, in caption size: **No membership needed to book a meeting room.** / **لا تحتاج إلى عضوية لحجز قاعة اجتماعات.**
- Submitting goes to `/meeting-rooms` with filters pre-applied — never to a login wall.
- **Motion:** none. This is utility.

#### Section 3 — The Floor · `--mars-void` · **signature**

| | |
|---|---|
| Eyebrow | `THE FLOOR` / `الطابق` |
| H2 | **One floor. Six ways to work.** / **طابق واحد. ست طرق للعمل.** |
| Body | Everything Mars Space offers sits on a single floor — five seconds from your desk to a meeting room, and from a meeting room to coffee. Select a zone to see it. |
| Body (AR) | كل ما تقدمه مارس سبيس يقع في طابق واحد — خمس ثوانٍ سيرًا من مكتبك إلى قاعة الاجتماعات، ومن القاعة إلى القهوة. اختر منطقة لاستعراضها. |

The interactive plan per §3.4, with a legend showing the six zone types and a live status line: `[N] of [N] meeting rooms free right now` / `[N] من [N] قاعات متاحة الآن`.

#### Section 4 — The six zones · `--mars-paper`

Three-column grid on desktop, 4:5 photography, hairline dividers. Each card: photograph, name (EN + AR), one line, capacity figure, link.

| Zone | Line | CTA |
|---|---|---|
| **Private Offices** / مكاتب خاصة | Lockable offices for teams of 2 to [N]. Your name on the door, your own network, 24/7 access. | `See offices` |
| **Coworking Desks** / مكاتب مشتركة | Hot desks by the day, dedicated desks by the month. Same floor, same access. | `See plans` |
| **Meeting Rooms** / قاعات اجتماعات | [N] rooms seating 4 to [N]. Book by the hour — membership optional. | `Book a room` |
| **Focus Pods** / غرف تركيز | Single-occupancy rooms for calls and deep work. Book one for an hour, or take one now. | `Book a pod` |
| **Community Space** / المساحة المجتمعية | Up to [N] people for events, workshops and courses. Configurable seating, full AV. | `Plan an event` |
| **Café & Lounge** / المقهى والاستراحة | Specialty coffee and quiet seating, included with every plan and every booking. | `See the space` |

**Motion:** stagger reveal, 60ms increment. Hover lift on cards.

#### Section 5 — Meeting rooms, live · `--mars-void`

| | |
|---|---|
| Eyebrow | `AVAILABLE TODAY` / `متاح اليوم` |
| H2 | **Book a room. Membership optional.** / **احجز قاعة. العضوية اختيارية.** |
| Body | Anyone can book a Mars Space meeting room — members and non-members, the same rooms at the same rates. Availability updates live. |
| Body (AR) | يمكن لأي شخص حجز قاعة اجتماعات في مارس سبيس — الأعضاء وغير الأعضاء، القاعات نفسها بالأسعار نفسها. يُحدَّث التوفر مباشرة. |

Horizontal scroller of room cards: photo, room name, capacity, `[SAR ___ / hr]`, and a **next-available chip** — `Free now`, `Free from 14:00`, `Booked today`. Card click goes straight to the room's booking page with today pre-selected.

#### Section 6 — Membership · `--mars-void` (continues, hairline separated)

| | |
|---|---|
| Eyebrow | `MEMBERSHIP` / `العضوية` |
| H2 | **Choose how you work.** / **اختر طريقتك في العمل.** |

Four compressed plan cards — Day Pass, Hot Desk, Dedicated Desk, Private Office — each with `from [SAR ___]`, three bullet inclusions, and a link. Full detail lives on `/membership`. CTA: `Compare all plans` / `قارن جميع الباقات`.

#### Section 7 — Community space · `--mars-paper`

| | |
|---|---|
| H2 | **Events, workshops and launches — hosted on our floor.** / **فعاليات وورش وإطلاقات — على طابقنا.** |
| Body | The community space seats up to [N] and reconfigures for talks, classes, demo days and private dinners. AV, seating and catering are handled by us. |
| Body (AR) | تتسع المساحة المجتمعية حتى [N] شخصًا، وتُعاد تهيئتها لتناسب المحاضرات والدورات وأيام العروض والعشاءات الخاصة. نتولى نحن التجهيزات السمعية والبصرية والجلوس والضيافة. |
| CTA | `Check dates` / `تحقق من المواعيد` |

Full-bleed 21:9 image with a subtle parallax.

#### Section 8 — Amenities strip · `--mars-paper`

Icon + label grid, 4 columns desktop / 2 mobile. Use real specifics, not generic claims:

`[___] Mbps symmetric fibre` · `Printing and scanning` · `Prayer room on floor` · `[N] parking bays` · `24/7 member access` · `Registered business address` · `Mail and package handling` · `Lockers` · `Phone booths` · `Reception and guest handling` · `Daily cleaning` · `Fully equipped kitchen`

#### Section 9 — Location · `--mars-paper`

| | |
|---|---|
| H2 | **Find us.** / **موقعنا.** |

Two columns: dark-styled embedded map on the left; on the right the address in Arabic and English, national address short code, `Open in Google Maps` and `Open in Apple Maps` links, parking guidance, nearest landmarks, and the hours table:

```
Sunday – Thursday    [08:00 – 20:00]     الأحد – الخميس
Friday               [Closed / ______]   الجمعة
Saturday             [10:00 – 18:00]     السبت
Members              24/7                الأعضاء
```

#### Section 10 — The Mars ecosystem · `--mars-slate`

| | |
|---|---|
| Eyebrow | `PART OF MARS` / `جزء من مارس` |
| H2 | **Mars Space is one of five.** / **مارس سبيس واحدة من خمس.** |
| Body | Mars Ventures builds companies from idea to exit. Mars Space is where that work happens — and it is open to everyone building something. |
| Body (AR) | مارس فينتشرز تبني الشركات من الفكرة حتى التخارج. مارس سبيس هي المكان الذي يحدث فيه ذلك العمل — وهي مفتوحة لكل من يبني شيئًا. |

Marquee of the five lockups per §4.2, each linking to its site. This band is what makes Mars Space feel backed rather than boutique, and it is the main reason the two sites should share a domain — see §11.1.

#### Section 11 — Closing CTA · `--mars-void`

| | |
|---|---|
| H2 | **Come see the floor.** / **تعال وشاهد الطابق.** |
| Body | Book a tour, or book a room and see it for yourself. |
| CTAs | `Book a tour` / `احجز جولة` · `Book a room` / `احجز قاعة` |

---

### 7.2 The Space — `/space`

The floor plan at full size as the hero, with a persistent side panel instead of a popover. Below it, the six zones in full-width alternating rows (image / text, mirrored each row), each linking to its detail page. This page is the "brochure" view for someone who wants to understand the whole offer before committing.

| | |
|---|---|
| H1 | **One floor, planned around how work actually moves.** / **طابق واحد، مصمَّم وفق حركة العمل الحقيقية.** |
| Sub | Focused work, scheduled work, and the conversations in between — each has its own place, and none of them is more than thirty steps from the others. |
| Sub (AR) | العمل المركّز، والعمل المجدول، والنقاشات بينهما — لكل منها مكانه، ولا يبعد أي منها أكثر من ثلاثين خطوة عن الآخر. |

---

### 7.3 Zone detail template — `/space/[zone]`

One template, six instances. Section order:

1. **Hero** — 21:9 photograph, zone name EN + AR, one-sentence positioning, capacity/price at a glance, primary CTA.
2. **Where it sits** — the floor plan with this zone highlighted and the others dimmed. Reinforces the single-floor story on every page.
3. **What's in it** — amenity grid with icon + label, per §3.6.
4. **Gallery** — 4–8 images, lightbox, keyboard navigable.
5. **The details** — specification table: dimensions, capacity, seating configurations, lighting, sound treatment, network, accessibility.
6. **Rates** — hourly / half-day / full-day / monthly as applicable, VAT-inclusive with the breakdown shown, member vs non-member columns where they differ.
7. **CTA band** — `Book` for instantly bookable zones, `Enquire` for contract zones, `Book a tour` on both.
8. **Related zones** — two cards.

**Per-zone headline copy:**

| Zone | H1 (EN) | H1 (AR) |
|---|---|---|
| Private Offices | Your team, behind a door that locks. | فريقك، خلف باب يُغلق. |
| Coworking | A desk when you need one. | مكتب حين تحتاجه. |
| Meeting Rooms | Rooms that are ready when you are. | قاعات جاهزة حين تكون جاهزًا. |
| Focus Pods | Private, for one. | خصوصية، لشخص واحد. |
| Community Space | Where your community gathers. | حيث يجتمع مجتمعك. |
| Café & Lounge | The part of the floor nobody schedules. | الجزء من الطابق الذي لا يُجدوَل. |

---

### 7.4 Meeting rooms index — `/meeting-rooms`

**Job of this page:** let anyone, member or not, find a free room and start a booking in under a minute. This is the site's highest-value page; treat it as an application, not a marketing page.

| | |
|---|---|
| H1 | **Book a meeting room.** / **احجز قاعة اجتماعات.** |
| Sub | Real-time availability, transparent hourly rates, instant confirmation. No membership required. |
| Sub (AR) | توفر لحظي، أسعار واضحة بالساعة، وتأكيد فوري. لا تتطلب عضوية. |

**Layout:** filter rail (left in LTR, right in RTL, collapsing to a sticky bar on mobile) + results.

**Filters:** date · start time · duration · capacity · amenities (screen, video conferencing, whiteboard, natural light, step-free access) · price range. Filters write to the URL so a filtered view is shareable and bookmarkable.

**Result card** — this is where most of the design effort goes:

```
┌──────────────────────────────────────────────────────────┐
│ [ photo 3:2 ]   Room name · اسم القاعة                   │
│                 ⃞ 8 seats  ⃞ 65" screen  ⃞ Zoom  ⃞ Board  │
│                                                          │
│                 ▓▓░░░░████░░░░░░████░░░░  ← day strip    │
│                 8   10   12   14   16   18               │
│                                                          │
│                 SAR ___ / hr, VAT incl.   [ Select ]     │
└──────────────────────────────────────────────────────────┘
```

The **day strip** is the key control: a compact horizontal bar of the room's whole day with booked blocks filled and free blocks open, drag-selectable directly on the card. A visitor can compare five rooms' availability at a glance and select a slot without opening a single detail page. Legend and colours per §2.2.

**Empty state:** `No rooms free from 10:00 to 12:00 on Sunday. The nearest options are 08:00–10:00 in Room [X], or 14:00–16:00 in Room [Y].` — always offers the two nearest real alternatives, never a dead end.

---

### 7.5 Meeting room detail — `/meeting-rooms/[slug]`

Section order:

1. **Gallery** — 4–6 images, first one 3:2, lightbox on click. Include a shot from the doorway, a shot of the screen wall, and a shot of the table at seated height.
2. **Header** — room name EN + AR, capacity, floor-plan mini-map showing its location, rate.
3. **Booking panel** — sticky on desktop (top-aligned, follows scroll), fixed to the bottom on mobile. Contains: date picker → time-slot grid → duration → live running total → `Continue`.
4. **What's included** — amenity list with real specifics: screen size and inputs, video-conferencing hardware and supported platforms, whiteboard type, table shape and seating configurations, power and network, natural light, blackout, accessibility, whether catering can be added.
5. **Specification table** — dimensions in m², ceiling height, sound rating, layouts supported (boardroom / U-shape / theatre) with a small diagram each.
6. **Rules and policies** — the cancellation window, how to get in on the day, guest access, what happens if you overrun.
7. **Other rooms** — three alternatives with the same date pre-applied.

**Slot grid spec:**

- 30-minute granularity, displayed as hour rows with two half-hour cells.
- Click-drag to select a range; click a selected edge to extend.
- Minimum booking 1 hour, maximum 8 hours, configurable per room.
- Past slots on today's date are disabled and struck through, not hidden — hiding them makes the day look shorter than it is.
- Buffer slots between bookings (turnover/cleaning) render per §2.2 and are not selectable.
- Selection updates a running total: `2 hours · SAR ___ · VAT included`.

---

### 7.6 Community space — `/community-space`

Higher-consideration and higher-value than a meeting room, so the page sells before it books.

| | |
|---|---|
| H1 | **Events, workshops and launches — hosted on our floor.** / **فعاليات وورش وإطلاقات — على طابقنا.** |
| Sub | Up to [N] people, four seating configurations, full AV, and a team that has run [N] events on this floor. |
| Sub (AR) | حتى [N] شخصًا، وأربع تهيئات للجلوس، وتجهيزات سمعية وبصرية كاملة، وفريق أدار [N] فعالية على هذا الطابق. |

Sections: hero → configuration switcher (theatre / classroom / rounds / standing — an interactive control that swaps both the plan diagram and the capacity figure, which is the natural interactive moment for this page) → what's included → AV specification → catering options → past events gallery → **availability calendar (month view)** → rates → enquiry or booking → FAQ.

The **month calendar** matters here: event organisers think in dates, not hours. Show the month with days marked available / partially booked / booked, and let a date click open the day's hourly view.

---

### 7.7 Membership — `/membership`

| | |
|---|---|
| H1 | **Choose how you work.** / **اختر طريقتك في العمل.** |
| Sub | Four plans, one floor, no long lock-ins. Every plan includes meeting-room credits, the café, and 24/7 access. |
| Sub (AR) | أربع باقات، طابق واحد، دون ارتباطات طويلة. تشمل كل باقة رصيدًا من ساعات قاعات الاجتماعات، والمقهى، ودخولًا على مدار الساعة. |

**Plan comparison table** — the single most scrutinised element on the page. Rows: price, contract term, access hours, desk type, meeting-room credits per month, guest passes, mail handling, business address registration, printing allowance, lockers, community space discount, notice period.

- A **monthly / annual toggle** showing the annual saving as a plain figure, not a percentage badge.
- Prices shown VAT-inclusive with `incl. 15% VAT` beneath, plus the ex-VAT figure — B2B buyers reclaim it and need to see both.
- **Sticky comparison header** when the table scrolls.
- Below: `Not sure which plan?` → `Book a tour` / `Talk to us` (WhatsApp, which is the dominant channel for this in Saudi Arabia).
- FAQ covering: notice periods, upgrading and downgrading, adding team members, what happens to unused meeting-room credits, whether a day pass can be credited against a membership.

**Application flow** (`/membership/apply`): plan → individual or company → details (CR number and VAT number for companies; national ID or Iqama for individuals) → start date → team size → document upload → review → submit. This produces a **lead plus a draft contract**, not an instant purchase — private offices and dedicated desks need a human in the loop. Set the expectation on screen: `We'll confirm availability and send your contract within one business day.`

---

### 7.8 Gallery, Events, About, Contact

**`/gallery`** — masonry grid filterable by zone, lightbox with keyboard and swipe navigation, lazy loading, alt text in both languages. Each image links to the zone it belongs to, so the gallery is a route into the product rather than a dead end.

**`/events`** — what's happening on the floor: upcoming and past. Each event has a detail page with date, host, capacity, and a registration link. Serves two purposes — it proves the community claim, and it is the site's main source of fresh content for search.

**`/about`** — H1: **A floor run like a company, not a lobby.** / **طابق يُدار كشركة، لا كردهة.** Covers what Mars Space is, the operating standard behind it, the team, and the Mars ecosystem. This page carries the parent brand's voice most directly and can reuse the guideline's vision, mission and values language.

**`/contact`** — address in both languages, national address, map, directions by car and by ride-hail (with a copyable pin), parking, hours, phone, WhatsApp, email, a contact form with a routing subject field (booking / membership / events / press / other), and a `Book a tour` scheduler. Do not hide the phone number behind a form — in this market it costs conversions.

---

## 8. Booking engine specification

### 8.1 Core principle

**Guest checkout is mandatory.** The brief is explicit that anyone can book a meeting room without being a member, and forcing account creation before payment is the single biggest drop-off point in booking flows. A visitor completes a paid booking with name, email, phone and payment only. After payment, offer — do not require — account creation with the password field pre-associated to the email just used.

### 8.2 Flow

```
Search / select room
   ↓
Select date + slot(s)              ← 10-minute HOLD created here
   ↓
Add extras (catering, extra seating, technician, parking)
   ↓
Details (name, email, phone, company, VAT no. if invoice needed)
   ↓
Phone OTP verification            ← reduces no-shows, standard in SA
   ↓
Payment (Mada / Apple Pay / Visa / Mastercard / bank transfer for invoiced accounts)
   ↓
Confirmation: reference, .ics file, QR access code, ZATCA-compliant tax invoice
   ↓
Email + SMS + WhatsApp confirmation
```

### 8.3 Holds and concurrency

Non-negotiable, and the most common thing booking builds get wrong:

- Selecting a slot creates a **hold** with a 10-minute TTL, visible to the user as a plain countdown: `Your slot is held for 9:42.`
- Held slots render as `On hold` to every other visitor — not as available, and not as booked.
- Holds are released on expiry, on abandonment, or on payment failure.
- The final write is **transactional with a database-level exclusion constraint** on `(resource_id, time_range)`. Application-level checks alone will double-book under load; use PostgreSQL `tstzrange` with a `GiST` exclusion constraint.
- If a hold expires mid-checkout, the user sees the slot re-offered if it is still free, or the two nearest alternatives if it is not. Never a bare error.

### 8.4 Availability rules engine

Configurable per resource, not hard-coded:

| Rule | Purpose |
|---|---|
| Opening hours by weekday | Sun–Thu vs Fri–Sat differ |
| Seasonal overrides | Ramadan hours, Eid, National Day, Founding Day |
| Minimum / maximum duration | e.g. 1h min, 8h max |
| Slot granularity | 30 min default |
| Buffer before / after | Turnover and cleaning |
| Minimum notice | e.g. no booking within 30 minutes of start |
| Maximum advance | e.g. 90 days |
| Blackout dates | Maintenance, private hire |
| Optional quiet windows | Configurable pause slots (e.g. around prayer times) — **off by default**, enabled per venue policy |
| Member vs guest rules | Members may get longer max duration or further advance booking |

### 8.5 Pricing

- Rate plans per resource: hourly, half-day, full-day, with automatic selection of the cheapest applicable combination (booking 5 hours should quote the half-day rate if lower, and say so: `Half-day rate applied — you saved SAR ___`).
- Peak / off-peak and weekday / weekend multipliers.
- Member discount applied at checkout when logged in.
- Promo codes with usage limits and expiry.
- **VAT 15% shown inclusive by default** with the breakdown visible: `SAR 345 total · SAR 300 + SAR 45 VAT`.
- Deposits for community-space bookings above a configurable value.

### 8.6 Community space: hybrid model

Do not force the same instant-checkout flow onto events. Recommended split:

- **Under 4 hours, no catering, standard configuration** → instant booking, same flow as a meeting room.
- **Half-day or longer, or any catering / AV / configuration change** → enquiry flow that places a **provisional hold for 48 hours** while the team confirms and sends a quote. The date shows as `On hold` publicly, which is honest and prevents double-selling.

### 8.7 Cancellation, rescheduling, no-shows

Publish the policy on the room page and repeat it at checkout with a checkbox, not a link. Suggested structure for Mars to confirm:

| Notice | Meeting room | Community space |
|---|---|---|
| More than 24h | Full refund or free reschedule | Full refund |
| 4–24h | 50% refund | 50% refund |
| Under 4h | No refund, reschedule at discretion | No refund |
| No-show | Charged in full | Deposit forfeited |

Rescheduling is available from the confirmation email via a signed link — **no login required.** A guest who booked without an account must still be able to change or cancel their own booking.

### 8.8 Access on the day

The confirmation contains a QR code. At launch it is presented at reception; once access control is integrated it opens the door for the booked window plus a 15-minute grace period either side. Design the confirmation email and the confirmation page around the QR from day one so nothing needs redesigning later.

### 8.9 Notifications

| Trigger | Channel |
|---|---|
| Booking confirmed | Email + SMS + WhatsApp |
| Tax invoice | Email (PDF, ZATCA-compliant with QR) |
| Reminder, 24h before | WhatsApp + email |
| Reminder, 1h before | SMS |
| Cancellation / reschedule | Email + SMS |
| Hold expiring | On-screen only |
| Post-visit | Email, 2h after, with a one-tap rating and a membership offer |

WhatsApp Business API is worth prioritising over email in this market — open rates are not comparable.

---

## 9. Member portal — Phase 2 outline

Gated at `/account`. Always `--mars-paper`, minimal motion, built as an application. Included here only so the public site's auth and data model connect correctly.

| Screen | Contents |
|---|---|
| Dashboard | Next booking, meeting-room credits remaining, unpaid invoices, access status, announcements |
| Bookings | Upcoming and past, reschedule, cancel, rebook, download .ics |
| Contract | Current plan, term, renewal and notice dates, signed PDF, request to upgrade / downgrade / cancel |
| Invoices | List, status, download ZATCA tax invoice PDF, pay outstanding, saved payment methods |
| Team | Invite and remove members, assign credits, set permissions, manage guest passes (company accounts only) |
| Access | QR credential, register a visitor, parking registration |
| Support | Ticket list and submission, categorised (facilities / IT / billing / other) |
| Profile | Details, language, notification preferences, password, two-factor |

Every one of these screens is a read or write against the same objects the ERP will own. Which is why §11.2 matters.

---

## 10. Component library

Build these once, in both directions, before any page is assembled.

**Foundations:** colour tokens (§2.2) · type scale (§2.3) · spacing scale · radii · motion tokens (§4.1) · elevation (dark: surface levels; light: hairlines) · focus ring (2px `--mars-copper` offset 2px, and `--copper-400` on dark).

**Primitives:** Button (primary copper pill / secondary outline / ghost / destructive; sizes S M L; loading and disabled states) · Input · Select · Date picker (Gregorian + Hijri toggle) · Time picker · Stepper · Checkbox · Radio · Toggle · Textarea · File upload · Chip · Badge · Tooltip · Tag.

**Composites:** Nav bar (transparent + solid) · Mega-menu · Mobile overlay menu · Footer · Language toggle · Room card · Zone card · Plan card · Amenity item · Price display (with VAT breakdown) · Gallery + lightbox · **Availability day strip** · **Slot grid** · **Month calendar** · Booking summary panel · Hold countdown · Stepper progress · Filter rail · Empty state · Skeleton loader · Toast · Modal · Drawer · Accordion · Comparison table · Marquee · Section header (eyebrow + rule + heading) · **Floor plan** (interactive, and static variant for embedding).

**States every component must ship with:** default, hover, focus-visible, active, disabled, loading, error, empty, RTL. A component is not done until all nine exist.

---

## 11. Technical architecture and integrations

### 11.1 Recommended stack

Given that a booking engine and later an ERP are in scope, this should be one application, not a marketing site with a booking widget glued on.

| Layer | Recommendation | Why |
|---|---|---|
| Framework | **Next.js (App Router)** + TypeScript | Server rendering for SEO on the marketing pages, plus a real application runtime for booking. Native i18n routing for `/ar` and `/en`. |
| Styling | **Tailwind** with the tokens from §2 as the theme, logical properties enabled | Enforces the token system; RTL handled by logical utilities |
| Motion | **Motion (Framer Motion)** for components, **GSAP + ScrollTrigger** for the floor plan and hero sequence | Framer alone struggles with complex scroll timelines; GSAP alone is heavy for component state |
| Content | **Sanity** or **Payload** | Marketing copy, room descriptions, amenities, events and gallery must be editable in both languages by the Mars team without a deploy |
| Database | **PostgreSQL** | The exclusion constraint in §8.3 is a Postgres feature and the reason for this choice |
| ORM | Prisma or Drizzle | — |
| Auth | Auth.js or Clerk, with phone OTP | Phone-first is the local norm |
| Hosting | Vercel, or AWS `me-central-1` (Bahrain) | If data residency is required for the ERP, go AWS from the start |
| Search | Not needed at this size | — |

**Domain:** use `space.mars.sa` rather than a separate domain. It consolidates SEO authority with the parent, makes the ecosystem story credible, and simplifies SSO when the portal ships.

### 11.2 The ERP seam

The ERP will eventually own contracts, invoicing, occupancy, leads and facilities. Build the website against a **service boundary** now so it doesn't need rewriting:

- The website owns: content, availability queries, holds, bookings, payments, and the customer-facing account.
- The ERP will own: contracts, invoicing and dunning, occupancy and space inventory, CRM, and facilities tickets.
- **Shared source of truth:** `Resource` (every bookable thing), `Customer`, `Company`, `Booking`, `Invoice`. Define these as a versioned internal API from day one, even if both sides start in the same codebase.
- Emit **domain events** — `booking.created`, `booking.cancelled`, `membership.applied`, `payment.captured`, `invoice.issued` — onto a queue from the beginning. Whatever the ERP turns out to be, it subscribes to those rather than reaching into the website's tables.

### 11.3 Data model sketch

```
Location ─┬─ Zone ─┬─ Resource ─┬─ ResourceType (office | desk | meeting_room | pod | community)
          │        │            ├─ Amenity[]
          │        │            ├─ Image[]
          │        │            ├─ RatePlan[] ── RateRule (peak, weekend, duration tier)
          │        │            └─ AvailabilityRule[]
          │        └─ FloorPlanShape (SVG path + hotspot metadata)
          │
          ├─ Booking ─┬─ Customer ── Company
          │           ├─ BookingLine (resource, time_range, price)
          │           ├─ Extra[] (catering, AV, seating, parking)
          │           ├─ Payment[]
          │           └─ Invoice
          ├─ Hold (resource, time_range, expires_at, session)
          ├─ Membership ── Plan ── Contract ── Invoice[]
          └─ AccessCredential (QR, valid_from, valid_to)
```

### 11.4 Integrations

| Need | Options |
|---|---|
| Payments | **Moyasar**, Tap, HyperPay, or Checkout.com — all support Mada, which is non-negotiable in Saudi Arabia, plus Apple Pay |
| E-invoicing | **ZATCA / Fatoora** Phase 2 compliance — XML invoice generation, cryptographic stamping, QR on every invoice. Use a certified provider rather than building it |
| SMS / OTP | Unifonic or Taqnyat (local sender ID registration required) |
| WhatsApp | WhatsApp Business API via Twilio, Unifonic or 360dialog |
| Email | Resend or Postmark, with Arabic RTL templates |
| Calendar | `.ics` attachments plus optional Google / Outlook sync in the portal |
| Maps | Google Maps with a dark-styled map matching `--mars-void` |
| Access control | Whatever the door system exposes — confirm the vendor's API before committing to QR entry |
| Analytics | GA4 + a privacy-friendly second source; PostHog for funnel and session replay on the booking flow |

---

## 12. Accessibility and performance targets

**Accessibility — WCAG 2.2 AA, and it is contractual, not aspirational.**

- All the contrast findings in §2.2 are binding. Copper is never text on dark.
- Every interactive element reachable and operable by keyboard, with a visible focus ring. The slot grid needs arrow-key navigation and space/enter to select — drag-select alone excludes keyboard and screen-reader users.
- The floor plan needs a **non-visual equivalent**: a list of zones with the same status information, available to screen readers and shown as a fallback.
- Booking state is never communicated by colour alone — every state carries a label or pattern (§2.2).
- Form errors: `aria-describedby`, inline, adjacent to the field, and announced.
- Images: alt text in the active language. Decorative images `alt=""`.
- Target size minimum 24×24px, 44×44px on mobile — slot cells in particular.
- Test with VoiceOver in Arabic. RTL screen-reader behaviour differs meaningfully from LTR.

**Performance budgets:**

| Metric | Target |
|---|---|
| LCP | < 2.5s on 4G |
| INP | < 200ms |
| CLS | < 0.1 |
| Initial JS | < 180KB gzipped |
| Hero image | < 250KB (AVIF with WebP fallback) |
| Fonts | 2 subset woff2 files (Latin, Arabic), preloaded, `font-display: swap` |
| Availability query | < 300ms p95 |
| Lighthouse | ≥ 90 across all four categories, on mobile |

Test on real devices over Saudi mobile networks, not on a desktop connection. The floor plan is the biggest risk — keep it as inline SVG with CSS/JS animation, never a canvas render or a video.

---

## 13. SEO and analytics

**Priority queries** (both languages): coworking space Jeddah / مساحة عمل مشتركة جدة · meeting room rental Jeddah / تأجير قاعة اجتماعات جدة · private office Jeddah / مكتب خاص جدة · event space Jeddah / قاعة فعاليات جدة · hourly meeting room / قاعة اجتماعات بالساعة.

- Each meeting room gets its own indexable page — long-tail queries for specific room sizes convert well.
- **Structured data:** `LocalBusiness` on the homepage, `Place` and `Offer` on zone pages, `Product` + `Offer` on room pages, `Event` on event pages, `BreadcrumbList` sitewide, `FAQPage` on membership.
- Google Business Profile in both languages, with the gallery images.
- `hreflang` pairs on every page, plus `x-default`.
- The `/book` flow is `noindex`.
- Sitemap split: static pages, rooms, events.

**Analytics — instrument the funnel properly:**

`quick_book_submitted` → `room_list_viewed` → `slot_selected` → `hold_created` → `details_started` → `otp_verified` → `payment_started` → `booking_confirmed`, plus `hold_expired` and `payment_failed`. Also track `plan_compared`, `tour_requested`, `whatsapp_clicked`, `floor_zone_opened`, and `language_switched`. Without these, nobody can tell whether the booking flow is working.

---

## 14. Assets and content required from Mars

The site cannot be built without these. This list is the critical path.

**Photography — commission one shoot, half a day minimum:**

| Subject | Shots |
|---|---|
| Floor overview | 3 wide, including one 21:9 for the hero |
| Each meeting room (× [N]) | 4 each: doorway wide, screen wall, table at seated height, one detail |
| Private offices | 4 across 2–3 different office sizes |
| Coworking area | 4: wide, desk detail, from the window, one with people |
| Focus pods | 2 |
| Community space | 4, in at least two seating configurations |
| Café and lounge | 3 |
| Amenities | 6: reception, kitchen, prayer room, lockers, printing, parking entrance |
| Detail texture | 6 for section breaks — materials, signage, lighting, door hardware |

Direction per §3.5. Deliver as 16-bit originals plus web-optimised AVIF/WebP at 1×/2×.

**Data:**

- Floor plan as a **vector file** (DWG, AI or SVG) — required for the signature element.
- Room data sheet per room: name (AR + EN), capacity, dimensions, layouts, full amenity list, hourly / half-day / day rates.
- Membership plan definitions with every comparison-table row filled in.
- Opening hours including Ramadan and holiday variations.
- Full address, national address short code, CR number, VAT registration number.

**Copy and legal:**

- Arabic review and sign-off of all copy in this document by a native speaker on the Mars team.
- Terms of service, privacy policy (PDPL-compliant), booking and cancellation policy, house rules.
- Membership contract template.

**Brand:**

- The `MARS Space` lockup in SVG, all four variants, both languages.
- The web font files, or confirmation to serve IBM Plex Sans Arabic from a self-hosted subset.
- A decision on the Arabic descriptor (§2.1).

---

## 15. Phasing

**Phase 1 — Public site + meeting-room booking.** Everything in §7 plus §8 for meeting rooms and focus pods. Guest checkout, payments, invoicing, notifications. This is the phase that generates revenue from non-members and should ship first.

**Phase 2 — Membership and portal.** Application flow, contracts, accounts, §9 portal, member rates and credits, access QR.

**Phase 3 — Community space full booking.** Configuration switcher, quotes, deposits, catering, the hybrid model in §8.6.

**Phase 4 — ERP.** Contracts, invoicing and dunning, occupancy, CRM, facilities. Consumes the events defined in §11.2.

Sequencing note: the floor plan (§3.4) depends on the vector plan file and on the booking engine's availability API. Start the plan file request immediately — it is usually the longest-lead item and it is the one thing that makes this site distinctive.

---

## 16. Open decisions

These need answers from Mars before build starts. Each blocks something specific.

1. **City and address.** Written throughout as Jeddah. → Blocks all location copy, map, SEO.
2. **Arabic descriptor for the sub-brand** — `مارس سبيس` (recommended) or `Space` left in Latin inside Arabic layouts. → Blocks the logo lockup, and therefore the header, favicon and every page.
3. **Domain** — `space.mars.sa` (recommended) vs a standalone domain. → Blocks DNS, analytics and SEO setup.
4. **All pricing** — hourly, half-day, day, and the four membership tiers. → Blocks every rate card.
5. **Room inventory** — how many meeting rooms, how many focus pods, capacities, names. Consider naming rooms after the Mars ecosystem (Ventures, Lab, VC, Consultancy) rather than numbers — it is free brand reinforcement on every booking confirmation.
6. **Cancellation policy** — confirm or replace the structure in §8.7.
7. **Prayer-time handling** — does the floor pause bookings, or stay open? → Blocks the availability rules configuration.
8. **Access control vendor** — determines whether QR entry ships in Phase 1 or Phase 2.
9. **Payment provider** — determines the checkout integration and the ZATCA path.
10. **Community space model** — confirm the hybrid split in §8.6, or choose fully instant or fully enquiry-led.
11. **Does Mars Space offer virtual offices / registered business address as a product?** It is listed as an amenity here, but in this market it is often a standalone revenue line and would need its own page and flow.
12. **Who maintains content after launch** — determines how much needs to be CMS-editable versus hard-coded, which materially affects build cost.

---

*Prepared against Mars Brand Guideline 2026. Sections 2.2, 2.3 and 4 contain extensions to the guideline (UI state colours, dark-surface copper tint, motion tokens) that are marked as such and should be reviewed by whoever owns the Mars brand before they become standard.*
