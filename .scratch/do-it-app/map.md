# Wayfinder Map: Do It (Couples Habit Tracker)

## Destination

A production-ready, ultra-minimalist couples habit tracker PWA with Linear-style dark aesthetic, 1-tap manual logging, balanced habit parity between Maciek and Myrna, tiered leaderboards (Weekly, Monthly, Yearly, Lifetime Karma), custom stakes & rewards, and persistent profile selection.

## Notes

- **Domain**: Couples habit tracking, gamified accountability, friendly competition.
- **Skills driving this map**: `wayfinder`, `grill-with-docs`, `domain-modeling`, `codebase-design`.
- **Standing preferences**:
  - PWA mobile-first (iPhone & Android home screen installable).
  - Pure Linear dark mode (`#08090a` / `#0d0e11`, hairline borders, high-contrast crisp typography, generous whitespace).
  - 3 Tabs: **Today**, **Duel**, and **Vault** (Karma, Stakes, Habits, Settings).
  - Zero-friction authentication: "Who are you?" profile selection (`Maciek` | `Myrna`) stored in persistent cookie/local state.
  - "Manual-First, API-Ready": Day 1 requires zero API keys/OAuth; all habits have instant 1-tap logging. Wearable APIs (Google Health, Fitbit, Strava, Hevy) are queued for Phase 2.

## Decisions so far

- [Platform Architecture](issues/00-platform-architecture.md): Next.js 15 PWA with Tailwind CSS, responsive mobile-first.
- [Identity & Access](issues/00-identity-and-access.md): Two profiles ("Maciek" and "Myrna"), zero-passwords, persistent device profile with setting switch.
- [API Integration Policy](issues/00-api-policy.md): Day 1 is 100% manual 1-tap logging. Wearables and Duolingo are in Phase 2 roadmap.
- [Habit Parity & Point Calibration](issues/01-point-calibration-and-categories.md): Balanced daily matrix with weekly frequency flexibility for physical training and reading page-scaled points.
- [Persistence & Offline Seam](issues/02-database-sync-and-offline-seam.md): LocalStorage default with zero setup, plus Supabase cloud sync adapter.
- [Linear UI & 3-Tab Views](issues/03-linear-dark-ui-and-daily-ritual.md): 3 spacious tabs (Today, Duel, Vault) with tactile 1-tap check-ins and confetti.
- [Rollover & Stakes](issues/04-stakes-and-rollover-mechanics.md): Midnight resets for weekly/monthly cycles with automatic carryover to Lifetime Karma, direct crediting without blocking modals.
- [Names & Point Recalibration](issues/05-refine-names-points-and-three-tab-architecture.md): Maciek & Myrna profiles, quantitative reading stepper up to 25 pts, meditation (10 pts), language (5 pts), skills (25 pts), personal project (25 pts).

## Frontier (Next Phase / Unblocked)

- `06-google-health-and-wearables-adapter.md` (Phase 2 Integration)
- `07-strava-and-hevy-webhooks.md` (Phase 2 Integration)

## Not yet specified

- Native iOS push notification service worker for reminder nudges.
- Duolingo automated scraping/streak polling.

## Out of scope

- Multi-tenant signups (strictly designed for Maciek & Myrna).
- Public social feeds or friend requests.
- Paywalls, ads, or monetization features.
