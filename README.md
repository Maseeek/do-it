# Do It ⚡

A minimalist, high-performance couples habit tracking and accountability duel built for **Maciek** and **Myrna**.

Designed with a sleek **Linear-inspired dark mode aesthetic**, 1-tap manual logging, calibrated habit parity, tiered leaderboards (Weekly, Monthly, Yearly, Lifetime Karma), and customizable mutual stakes.

---

## ✨ Features

- **Linear Dark Palette**: Deep black `#08090a` canvas, hairline `#27272a` borders, and high-contrast typography.
- **1-Tap Tactile Logging**: Fast, frictionless check-ins with micro-animations, celebration confetti, and synthesized Web Audio clicks & fanfare chimes.
- **Interactive 7-Day Date Traveling**: Slide across calendar days to view history or retroactively backfill habits.
- **Couples Activity Feed**: Chronological timeline of check-ins, micro-notes, photo proofs, and 1-tap cheer reactions (`⚡`, `💪`, `🍕`, `☕`).
- **Check-in Micro-Notes**: Attach workout details, book chapters, or daily reflections directly to completions.
- **Deep Duel Analytics**: 
  - Real-time head-to-head tug-of-war score bar & lead differentials.
  - Weekly Daily Battles comparison chart (Monday through Sunday).
  - Category Dominance Matrix comparing Foundation, Gym, Cardio, Intellect, Mind, Deep Work, Skills, Nutrition, Environment, and Language.
- **Consistency Matrix (12-Week Heatmap)**: Interactive GitHub/Linear-style annual contribution grid for both Maciek and Myrna.
- **Trophy Cabinet & Badges**: 12 dynamically calculated milestone achievements (e.g. *Daily Par Master*, *Centurion Reader*, *Clean Space Sentinel*, *Iron Couple Synergy*).
- **Streak Protection & Rest Days**: Declare scheduled recovery days that protect active streaks without penalty.
- **Reading Page Stepper**: Quantitative habit tracking awarding 1 point per page up to a 25-point cap.
- **Balanced Parity Matrix**: 10 daily habits with a **240 Daily Par target** and weekly frequency flexibility (Gym 4x/wk, Sport 3x/wk).
- **Stakes & Hall of Champions**: Weekly (Sunday dinner dates) and Monthly (Spa getaways) reward stakes with historical winners ledger.
- **Desktop Keyboard Shortcuts**: Jump between tabs (`1`, `2`, `3`), toggle shortcuts cheat-sheet (`?`), and dismiss modals (`Esc`).
- **URL Automation & Deep Linking**: Quick log habits directly via URL query parameters (`?action=checkin&habit=...`) for iOS Shortcuts and Siri.
- **Full Data Sovereignty**: 1-click JSON backup export & restore, plus shareable weekly text scorecard generator.
- **Private two-player duels**: Create an account, start a duel, and invite one other account with a one-use link. Each player owns their own habits and check-ins.
- **PWA Ready**: Dynamic app icons (`/icon`, `/apple-icon`, `/manifest.webmanifest`) ready for *"Add to Home Screen"* on iOS & Android.
- **Supabase sync**: Authenticated duel habits, check-ins, notes, cheers, rest days, and stakes sync across devices. Without Supabase configuration, the original local profile mode remains available.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **Micro-effects**: [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **Persistence**: Hybrid LocalStorage + optional [Supabase](https://supabase.com)

---

## 🚀 Getting Started

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

Run `npm run check` before a pull request; it runs typecheck, lint, and the committed tests.

### Enable multiplayer

1. In a Supabase project, run [`supabase/duels.sql`](supabase/duels.sql), then [`supabase/duels-extras.sql`](supabase/duels-extras.sql) in the SQL Editor. These create isolated duel tables, invitation functions, and row level policies.
   For an existing deployment that already ran `duels.sql`, apply [`supabase/replace-solo-duel.sql`](supabase/replace-solo-duel.sql) to enable switching from an unpaired solo duel to an invitation.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` and in your hosting environment. Use the publishable or anon key, never a secret or service role key in `NEXT_PUBLIC_` variables.
3. Enable email and password sign in in Supabase Authentication. Add your deployed site URL to the Auth redirect URLs if email confirmations are enabled.
4. Restart the app. The first player signs up and creates a duel, then shares the link from the Duel tab. The invited player signs up or signs in and accepts it.

New players choose habits during onboarding. The general catalog starts unselected; each player can use different habits while matching the same possible weekly points.

### Bring previous progress into an account

After signing in and completing habit onboarding, open **Vault → Settings → Bring back previous progress** and choose **Import from previous app**. This reads Maciek's or Myrna's habits and historical check-ins from the older Supabase tables and merges them into the signed-in player's duel. Existing account habits and check-ins are kept. Newly imported habits start paused; open **Choose habits** to activate any you want in your current point plan. The import can be run again safely.

If your older progress is in a Do It JSON backup rather than Supabase, use **Import a backup file** in the same section. The import preserves historical dates, earned points, quantities and proof references. Repeated old check-ins for the same habit and date are consolidated so they do not award points twice.

### Mobile Installation (Add to Home Screen)

1. Deploy to [Vercel](https://vercel.com) by connecting this repository.
2. Open your deployed URL on your phone (Safari on iOS, Chrome on Android).
3. Tap **Share → Add to Home Screen**.
4. Launch "Do It" directly from your home screen as a standalone borderless app.

---

## 🗺️ Architecture & Decisions

- Domain glossary: [`CONTEXT.md`](CONTEXT.md)
- Architectural Decision Records: [`docs/adr/`](docs/adr/)
- Agent issue-to-PR workflow: [`docs/agent-workflow.md`](docs/agent-workflow.md)
- Agent skill setup: [`docs/agents/`](docs/agents/)
