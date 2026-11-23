# Do It

A habit tracker for two people who want to keep each other accountable. Each player picks their own habits, and the app scores them on a shared scale so they can compete head to head.

Live app: [do-it-plum-seven.vercel.app](https://do-it-plum-seven.vercel.app)

## What it does

- Two players pair up through a one-use invite link and compete in a private duel.
- Each player chooses habits from a catalog or writes their own. Different routines (say, basketball vs. running) are calibrated to the same daily points ceiling so the scores stay fair.
- Leaderboards reset every week, month and year. Lifetime Karma keeps growing and can't be spent.
- Players can set weekly or monthly stakes. When the period closes, the scoreboard decides the winner.
- Steps, sleep and workouts can be checked off automatically from Google Health, Apple Health, Strava and Hevy.
- It works offline with no account, and syncs in real time once both players sign in.

## How it's built

Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS v4 on the front end. Supabase (Postgres, Auth, Realtime) for data, Stripe for subscriptions, and Vercel for hosting and the daily cron job.

Some decisions worth pointing out:

- **Data isolation in the database.** Every duel table uses Postgres row-level security. Both players can read their shared duel, but write policies check `auth.uid()` against the player's slot, so neither can edit the other's habits or check-ins. Creating and joining duels goes through `security definer` functions with an empty `search_path`.
- **No double points.** A unique index on habit, duel and date stops repeat taps, retries or overlapping wearable syncs from scoring the same check-in twice.
- **Encrypted wearable tokens.** OAuth refresh tokens stay on the server. They're encrypted with AES-256-GCM (Node `crypto`, random 12-byte IV) before they're stored, and the table that holds them is locked to the service role.
- **Timezone-aware sync.** The daily cron job works out each user's local day, re-checks both yesterday and today to catch late wearable uploads, and never overwrites a manual check-in.
- **Fair stake settlement.** Stakes are settled by a pure function over shared check-ins, so both players' devices reach the same result. A one-day grace period allows late logs before the verdict.

Design notes live in [`CONTEXT.md`](CONTEXT.md) and the ADRs in [`docs/adr`](docs/adr).

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase environment variables, the app runs in local offline mode.

To use accounts and multiplayer, copy `.env.example` to `.env.local`, add your Supabase URL and anon key, and run the SQL files in [`supabase/`](supabase) starting with `duels.sql` and `duels-extras.sql`. Wearable sync and billing need extra keys. See [`docs/health-launch.md`](docs/health-launch.md) and [`docs/billing`](docs/billing).

## Tests

```bash
npm run check
```

This runs the TypeScript typecheck, ESLint, unit tests on the Node test runner, and database tests that run the SQL against an in-memory Postgres (PGlite).
