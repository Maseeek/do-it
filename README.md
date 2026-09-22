# Do It ⚡

A minimalist, high-performance couples habit tracking and accountability duel built for **Maciek** and **Myrna**.

Designed with a sleek **Linear-inspired dark mode aesthetic**, 1-tap manual logging, calibrated habit parity, tiered leaderboards (Weekly, Monthly, Yearly, Lifetime Karma), and customizable mutual stakes.

---

## ✨ Features

- **Linear Dark Palette**: Deep black `#08090a` canvas, hairline `#27272a` borders, and high-contrast typography.
- **1-Tap Tactile Logging**: Fast, frictionless check-ins with micro-animations and celebration confetti.
- **Reading Page Stepper**: Quantitative habit tracking awarding 1 point per page up to a 25-point cap.
- **Balanced Parity Matrix**: 10 daily habits with a **240 Daily Par target** and weekly frequency flexibility (Gym 4x/wk, Sport 3x/wk).
- **The Duel**: Real-time head-to-head tug-of-war score bar, lead differentials, and side-by-side mutual checklist.
- **Stakes & Wagers**: Weekly (Sunday dinner dates) and Monthly (Spa getaways) reward stakes with direct prize crediting.
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
