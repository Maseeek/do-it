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
- **Zero-Password Profile Identity**: 1-time "Who are you?" device picker persisted for everyday use.
- **PWA Ready**: Dynamic app icons (`/icon`, `/apple-icon`, `/manifest.webmanifest`) ready for *"Add to Home Screen"* on iOS & Android.
- **Cloud Sync Seam**: Runs offline-first with zero setup, with optional Supabase PostgreSQL sync configurable in Settings.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router, Turbopack)
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

### Mobile Installation (Add to Home Screen)

1. Deploy to [Vercel](https://vercel.com) by connecting this repository.
2. Open your deployed URL on your phone (Safari on iOS, Chrome on Android).
3. Tap **Share → Add to Home Screen**.
4. Launch "Do It" directly from your home screen as a standalone borderless app.

---

## 🗺️ Architecture & Decisions

- Domain glossary: [`CONTEXT.md`](CONTEXT.md)
- Architectural Decision Records: [`docs/adr/`](docs/adr/)
- Wayfinder planning map: [`.scratch/do-it-app/map.md`](.scratch/do-it-app/map.md)
