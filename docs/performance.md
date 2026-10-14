# App loading and interaction performance

## 2026-10-12 follow-up

Compared production builds against `e7b284e` with Chrome 148 on the same machine. The local fixture has 730 prior days across 20 seeded Habits: 14,600 Check-ins, about 2.3 MB. These results measure local client work. The mobile scenario uses a 390×844 viewport and 4× CPU throttling; it does not represent a physical phone or hosted Supabase latency.

The first open of a deferred view waited about 300 ms after its JavaScript was available. The installed React DOM production runtime throttles Suspense fallback replacement. Deferred views now use a guarded import resource and stable external-store snapshots, keeping the deployment check before activation. Tab and Settings imports also warm on pointer entry or keyboard focus. The initial page still loads its existing frame and Today view.

The same loader also removes the remaining delay from default account entry and first-run onboarding. With a browser-local heading probe after document navigation, account entry falls from 379.7 to 80.6 ms and onboarding from 496.9 to 197.1 ms (five samples per flow, mock requests at 50 ms). Signup/sign-in switching and saving a first habit plan pass. The original locator-based timing was superseded because retry polling added a fixed delay to the observation.

First-open medians, five samples per view, document reload before every sample, HTTP cache retained, and two animation frames after content becomes ready:

| View | Before | After |
| --- | ---: | ---: |
| Progress | 331.3 ms | 53.6 ms |
| Duel | 331.3 ms | 44.8 ms |
| Settings | 334.8 ms | 41.3 ms |
| Activity | 333.4 ms | 40.2 ms |
| Attach Proof | 350.2 ms | 39.1 ms |
| Shortcuts | 352.9 ms | 48.3 ms |

Repeated interactions alternate build order, with 20 Check-in/undo pairs per build and scenario. Timing includes the real state update, one observed synchronous localStorage write, and two animation frames. The saved state is parsed after timing:

| Scenario | Action | Before | After |
| --- | --- | ---: | ---: |
| Desktop | Weekly Check-in | 48.6 ms | 41.4 ms |
| Desktop | Undo | 53.3 ms | 45.4 ms |
| Mobile viewport, 4× CPU | Weekly Check-in | 196.3 ms | 172.0 ms |
| Mobile viewport, 4× CPU | Undo | 149.8 ms | 123.1 ms |

Today streaks reuse the existing Check-in index, selected-day sums stay memoized, and badges are computed when the Trophy Cabinet mounts. Weekly Duel totals aggregate history once. Activity parses each timestamp once before sorting and skips search-string construction for an empty query, while retaining full-history search, counts, stable ties, and backdated records. Local persistence remains synchronous.

Production copies configured for a localhost Supabase mock verify the actual client, store effect, Phoenix subscriptions, and paginated reads. With 2,500 Check-ins, a burst of 20 realtime events drops from 140 requests to 7; exact-count requests drop from 140 to 5. Events during an active read produce one serialized follow-up. A 400-row server cap still returns all 2,500 records, with 11 requests and 5 exact counts per reload. These request counts describe the mock, not hosted latency. When a total is missing or nonnumeric, pagination continues through the empty page so a short server-capped response cannot truncate history.

That verification reproduced a read/write race on the original build: a read started before a local Check-in briefly replaced its optimistic state. The store now rejects reads when the pending-write queue changes during loading and requests a fresh read. The same browser reproduction keeps the Habit checked throughout. Initial loading, Check-in/undo writes, Activity counts, and isolation from local history also pass in the mock.

`npm run check` passes 165 tests, typecheck, and lint; `npm run build` passes. Browser checks cover photo upload and undo, proof gallery, historical calendar navigation and Today reset, shortcut focus trapping and cleanup, light/dark themes, offline Check-in/undo and warmed views, and persisted history after reload. The measured desktop and mobile viewports have no horizontal overflow. Deployment mismatch, recovery reload limits, unavailable version endpoints, offline activation, duplicate records, rest days, and streak caps have focused tests.

Reproduction commands and raw measurements are in [the October 12 evidence directory](performance/2026-10-12/README.md). Run `npx tsx scripts/benchmark-performance.ts` for calculation medians, including shared-index construction and all active Today streaks. The calculation benchmark is separate from the browser timings above.

## 2026-10-10 pass

Measured against main at `779dd85` on 2026-10-10, using production builds, Node 20.20.2 and Chrome on the same machine. The fixture contains 730 days for all 20 seeded habits, or 14,600 check-ins. These local measurements isolate client work; they do not measure authenticated Supabase latency or mobile hardware.

Run the calculation benchmark with `npx tsx scripts/benchmark-performance.ts`. Each result is the median of five runs after one warm-up. Before the change, the weekly check-in diff used the store's `find` for each rebalanced record. The new benchmark uses the store's positional comparison, since rebalancing preserves array order.

- Both Player score summaries: 147.92 ms before, 1.68 ms after.
- Rebalance all weekly history at hydration: 437.82 ms before, 2.60 ms after.
- Rebalance and identify changed weekly Check-ins: 365.70 ms before, 0.96 ms after.
- Weekly Check-in in the production browser: 937.7 ms before, about 70 ms after. Timed from the same button's click through two animation frames, including the state update and local persistence.
- Initial profile-screen JavaScript: 263,566 bytes before, 236,360 bytes after (10.3% smaller). Sum of script resource `encodedBodySize` in Chrome on initial navigation, excluding polyfills the browser does not request.

The changes group weekly records once, index Check-ins by Habit/date and unique completion dates by Habit/week, and reuse expensive view calculations. Duel, Progress, Settings, onboarding, Activity, proof dialogs, keyboard shortcuts and confetti load when used. Today and the app frame stay available immediately.

Verification includes `npm run check` (101 tests, typecheck and lint), `npm run build`, and comparison with the original scoring, category breakdown and rebalancing functions across every record in the large fixture. The production browser checks profile selection, weekly Check-in/undo with the point cap and persisted records, date navigation, the 52-week Progress calendar, Activity, Duel, Settings, habit planning, proof attachment and keyboard shortcuts. The completed browser flow emitted no page errors.

Verification also found that Progress's "Open day" was overwritten by the effect that reset the date whenever Today mounted. Date resets now run on explicit Today navigation, preserving dates opened from the calendar. The browser checks both the historical date and the Today button's reset.
