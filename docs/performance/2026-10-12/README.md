# October 12 performance evidence

Baseline application source is `e7b284e`. Measurements use production builds and synthetic history in isolated browser contexts. The current source includes guarded deferred views, indexed streaks, coalesced Duel reloads, and rejection of reads that overlap local writes.

## Reproduce local browser measurements

Serve the baseline and current production builds on separate localhost ports, with Supabase environment variables unset. Keep the current checkout on its branch. For the baseline, extract a source snapshot with `git archive e7b284e`; run `npm ci`, `npm run build`, then `npm run start -- --port 43127` in that snapshot. Run the current build on port 43130. The scripts accept different URLs with `--baseline` and `--current`.

Install browser tooling outside the app's dependencies:

```sh
npm install --prefix .scratch/browser-tools playwright
.scratch/browser-tools/node_modules/.bin/playwright install chromium
```

Run from the repository root:

```sh
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/benchmark-browser.cjs --mode first-open --samples 5 --output .scratch/first-open.json
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/benchmark-browser.cjs --mode interactions --samples 20 --output .scratch/interactions.json
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/benchmark-browser.cjs --mode interactions --mobile --cpu 4 --samples 20 --output .scratch/interactions-mobile.json
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/benchmark-browser.cjs --mode offline --output .scratch/offline.json
```

Use `--chrome /path/to/chrome` to select an installed browser. This run used `/usr/bin/google-chrome`, version 148.0.7778.178. Timing ends after actual content or persistence and two animation frames. First-open samples reload the document but retain the HTTP cache. Interaction samples alternate build order and parse the saved state after timing. The mobile option changes the viewport; CPU throttling is synthetic.

## Reproduce Duel reload and write-race checks

Use separate baseline/current production snapshots configured for the mock below. They must not share the anonymous builds used above, because public environment variables are embedded during build:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-publishable-key npm run build
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-publishable-key npm run start -- --port 43131
```

Serve the corresponding current snapshot on port 43132. No Supabase server is required: Playwright handles the localhost HTTP responses and Phoenix WebSocket protocol. The fixture contains 2,500 Check-ins; responses wait 50 ms. `npm test` in the repository root creates the compiled seed module used by the harness.

```sh
npm test
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/verify-duel-performance.cjs --page-cap 1000 --output .scratch/duel-reload.json
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/verify-duel-performance.cjs --page-cap 400 --output .scratch/duel-cap400.json
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/verify-duel-performance.cjs --race --output .scratch/duel-race.json
NODE_PATH="$PWD/.scratch/browser-tools/node_modules" node scripts/verify-entry-performance.cjs --smoke --output .scratch/entry-performance.json
```

The reload checks assert full history, counts, filtered queries, twenty-event bursts, one follow-up for events during loading, actual Check-in/undo writes, and unchanged local history. The race check observes the Habit button while a read overlaps a local write: the baseline becomes unchecked temporarily; the current build remains checked. These tests verify client behavior and request amplification against a mock. They do not establish hosted database latency or server-side authorization.

The entry check uses empty auth for the default account screen, then a synthetic account with an empty Duel for first-run onboarding. It measures the heading with a browser-local probe and two animation frames after document navigation. `--smoke` also switches signup/sign-in modes and saves a new habit plan through the mock. No real account is created.

## Recorded artifacts

- [First opens](first-open.json): five samples per view and build from `benchmark-browser.cjs`.
- [First opens with a mobile viewport and 4× CPU](first-open-mobile.json): five samples per view and build under synthetic throttling.
- [Repeated interactions](interactions.json): twenty alternating Check-in/undo pairs per build, desktop and synthetic mobile scenarios.
- [Offline](offline.json): local mutation/undo, warmed views, and persisted history after reconnect/reload.
- [Duel reloads](duel-reload.json): pagination and request counts with a 1,000-row page cap.
- [Duel reloads with a 400-row cap](duel-cap400.json): no history truncation with a lower server limit.
- [Read/write race](duel-race.json): the same UI reproduction on baseline and current source.
- [Account entry and onboarding](entry-performance.json): five navigation samples per flow and build, plus mode switching and a saved first plan.

Earlier instrumentation that polled and parsed the entire stored state inside the timed interaction was superseded. The accepted interaction artifact observes one real storage write and parses its value after timing. The mock also exposes `Content-Range` to the browser and waits for quiescence across pagination gaps. These corrections are recorded in the decision trail.

The [decision trail](decisions.tsv) records accepted and abandoned work. Earlier diagnosis logs and quota-interrupted child reports remain local under `.scratch/performance-overnight`; the accepted measurements above and their reusable harnesses are committed here.
