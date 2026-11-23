# November 23 section-switch evidence

Baseline is `b6ceecd`. Both builds are production builds of the same machine's checkout, with Supabase variables unset (local mode) and a deployment version set, as on Vercel. Without a version, the client skips its deployment check, so earlier local benchmarks never paid for it.

## What was slow

The first visit to Duel, Progress, Settings or Today's Activity waited for `/api/app-version` before rendering. The chunk was usually already cached from the pointer warm-up; the version request was the whole wait: about 45 ms on a desktop connection and 155 ms on Lighthouse's mobile network. Hosted serverless latency adds to that.

Every switch also unmounted the previous section and rendered the next one from scratch. With 4× CPU throttling, returning to Today or Duel took 60–120 ms across runs. React's profiling build, traced in Chrome DevTools, attributed the rest to:

- Duel scanning all 14,600 Check-ins once per Habit to count today's completions (about 23 ms per render at 4× in the profiling build).
- Today's Activity rebuilding its timeline from full history on every open.
- `scrollIntoView` and `scrollLeft = scrollWidth` effects that re-ran, forcing layout, every time Today or Progress opened.

## What changed

- **Prefetch at idle.** Once Today has painted, the browser loads Duel, Progress, Settings, Activity, the proof dialogs and the shortcuts dialog when idle. One shared deployment check runs first, so no lazy chunk is ever requested without it. Opening a section later needs no network.
- **Keep sections mounted.** Today, Duel, Progress and Settings, and Today's Ritual and Activity, render inside React 19.2 `<Activity>` boundaries. Hidden sections pre-render in the background at the lowest priority; a switch only reveals one. Hidden sections run no effects, so they make no requests and read no proof images until shown.
- **Reveal without re-rendering.** Tab callbacks are stable and views are memoized, so a switch renders only the navigation.
- **Indexed Duel lookups.** Duel uses the store's existing Habit/date index instead of scanning Check-ins.
- **Scroll effects run when their input changes.** The date strip and heatmap keep their scroll offset while hidden; checked in Chrome, and WebKit saves the offset of a re-displayed box the same way.

### Behavior changes

- Sections remember their state between visits: Today's Ritual/Activity choice, Duel's period and segment, Progress filters. This matches native tab bars. Settings still starts fresh on every open: closing it swaps in a new, hidden instance.
- Transient animations reset when a section hides. Today and Habit cards clear check-in lock and pulse states in a `useLayoutEffect` cleanup, following the Next.js guide in `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`. A celebration for Check-ins synced while Today was hidden does not play on return.
- The deployment check moves from each section's first open to one background request after Today paints. A session left open across a deployment keeps the section code it already loaded instead of reloading to Today when a section first opens. Any lazy view that is still unloaded runs the check before importing.
- On a cold cache, the idle prefetch downloads 9 more script chunks, 149.7 KB encoded, after Today paints. JavaScript loaded before Today is unchanged (246.3 KB before, 246.7 KB after).

## Results

Chrome 157, seven samples per step and build, builds alternating every sample. 730 prior days across 20 seeded Habits (14,600 Check-ins). Each sample reloads the document with the HTTP cache retained, waits for Today and one idle second, then walks every section with DevTools Protocol input. Desktop hovers 150 ms before clicking. Mobile taps at 390×844 with 4× CPU throttling and Lighthouse's mobile network (150 ms RTT, 1.6 Mbps). Desktop uses Lighthouse's desktop network (40 ms RTT, 10 Mbps). Time runs from `pointerdown` to the first frame painted after the destination content is visible. Medians:

| Step | Desktop before | Desktop after | Mobile before | Mobile after |
| --- | ---: | ---: | ---: | ---: |
| Page load → Today | 130.6 ms | 138.1 ms | 485.8 ms | 482.0 ms |
| Today → Activity | 67.9 ms | 16.1 ms | 230.8 ms | 51.3 ms |
| Activity → Ritual | 14.8 ms | 15.2 ms | 46.6 ms | 56.1 ms |
| Today → Duel | 67.5 ms | 16.0 ms | 254.0 ms | 59.6 ms |
| Duel: Week → Month | 21.2 ms | 16.9 ms | 60.3 ms | 52.3 ms |
| Duel: Month → Week | 16.1 ms | 16.5 ms | 54.4 ms | 44.9 ms |
| Duel: Battles | 15.9 ms | 16.4 ms | 50.0 ms | 39.2 ms |
| Duel: Categories | 15.6 ms | 16.0 ms | 34.3 ms | 45.5 ms |
| Duel → Progress | 64.2 ms | 16.3 ms | 228.1 ms | 63.7 ms |
| Progress → Today | 18.6 ms | 16.8 ms | 70.7 ms | 69.8 ms |
| Today → Duel (again) | 17.7 ms | 16.8 ms | 76.1 ms | 43.0 ms |
| Duel → Settings | 64.5 ms | 15.2 ms | 216.3 ms | 55.9 ms |
| Settings → Today | 18.4 ms | 16.7 ms | 61.9 ms | 68.0 ms |
| Check-in | 63.4 ms | 72.0 ms | 218.3 ms | 226.5 ms |
| Undo | 48.6 ms | 47.6 ms | 172.6 ms | 166.0 ms |

Across all 84 measured section switches per build, the slowest mobile switch fell from 270.9 to 86.6 ms; before, 29 exceeded 100 ms and 28 waited on the network, after, none did. On desktop the slowest switch fell from 71.0 to 20.8 ms. Page load and the steps that were already fast vary within overlapping per-sample ranges; the raw samples are in [navigation-desktop.json](navigation-desktop.json) and [navigation-mobile.json](navigation-mobile.json).

Check-ins remain slow in local mode in both builds. A DevTools trace shows one 200 ms task at 4× in each, almost all of it the synchronous `JSON.stringify` and `localStorage.setItem` of the full 2.3 MB state. Desktop medians are 8.6 ms higher after; the traced mobile sample shows no background rendering before the frame. Accounts in a Duel persist through IndexedDB asynchronously instead, so this cost is local mode only.

## Reproduce

Install browser tooling outside the app's dependencies, then serve the baseline (`git archive b6ceecd`) and current production builds on two ports. Build each with Supabase variables unset and a version set, for example `VERCEL_GIT_COMMIT_SHA=baseline npm run build`, then `npm run start -- --port 43201`.

```sh
npm install --prefix .scratch/browser-tools playwright-core
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/benchmark-navigation.cjs \
  --url http://localhost:43201/ --url http://localhost:43202/ --name before --name after \
  --samples 7 --profile mobile --output .scratch/navigation-mobile.json
```

Use `--profile desktop` for the desktop run and `--trace <prefix>` to save a Chrome DevTools trace of the first measured sample per build. The script uses the installed Chrome; pass `--chrome <path>` to choose another.
