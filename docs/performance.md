# App loading and interaction performance

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
