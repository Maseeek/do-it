# App Store Listing & Release Specification: Do It

## Metadata & Store Front

| Field | Value | Constraints |
| :--- | :--- | :--- |
| **App Name** | `Do It – Habit Duels & Streaks` | 29 / 30 chars |
| **Subtitle** | `Minimalist Habit Duel Tracker` | 29 / 30 chars |
| **Primary Category** | Health & Fitness | App Store Standard |
| **Secondary Category** | Productivity | App Store Standard |
| **Age Rating** | 4+ (Infrequent/Mild Contests) | Global Rating |
| **Bundle ID** | `com.doit.app` | Reverse DNS |
| **SKU** | `DOIT-IOS-001` | Internal ID |
| **Copyright** | © 2026 Do It Labs | Legal |

---

## Promotional Text (166 / 170 chars)

> Crush goals, duel friends with real stakes, and auto-verify workouts via Apple HealthKit. Zero friction, instant keyboard logging, and pristine Linear dark aesthetics.

*(Can be updated between releases without a binary submission).*

---

## Keywords (96 / 100 chars)

```text
habit,tracker,duel,routine,streak,discipline,fitness,healthkit,couples,linear,workout,focus,par
```

*(Separated strictly by commas, zero whitespace after commas for character efficiency).*

---

## Full App Store Description

Do It is a high-performance, minimalist habit tracking and head-to-head accountability app built for people who value discipline, speed, and craft. 

Say goodbye to cluttered menus, bloated animations, and endless popups. Do It is engineered with a signature Linear dark aesthetic, lightning-fast interactions, and native Apple HealthKit automation so you can focus on doing the work.

### WHY DO IT?

Most habit trackers feel like chores. Do It turns personal growth into a razor-sharp system of record and competitive accountability. Whether you are hitting daily fitness milestones, reading 25 pages, crushing deep work blocks, or competing with your partner for weekend stakes, Do It gives you instant clarity on who is putting in the reps.

---

### CORE FEATURES

#### 1. HEAD-TO-HEAD DUELS & CUSTOM STAKES
• Challenge your partner, best friend, or rival to weekly and monthly habit duels.
• Put real stakes on the line: loser buys dinner, cleans the apartment, or handles grocery duties.
• Real-time scorecards, parity margins, and live duel leaderboards keep accountability uncompromising.

#### 2. AUTOMATIC APPLE HEALTHKIT VERIFICATION
• Automatic background verification for your core physical habits.
• Sleep tracking: Log restorative sleep milestones automatically from Apple Watch or Sleep Cycle.
• Daily step goals: Seamlessly sync 6k, 10k, or 14k daily steps.
• Workouts & Cardio: Auto-complete strength training and cardio habits when HealthKit detects 20+ active minutes.
• No duplicate entries, no manual fumbling.

#### 3. ZERO-FRICTION SPEED & KEYBOARD COMMANDS
• Log habits in sub-100 milliseconds with ultra-fast haptics.
• Comprehensive keyboard shortcuts on iPad and Mac Catalyst (1–9 keys for habits, Space for quick check-in).
• Offline-first architecture with instant optimistic updates and seamless cloud synchronization.

#### 4. LINEAR DARK CRAFT & MINIMALIST DESIGN
• Obsidian OLED-native surfaces with calibrated contrast levels.
• Glowing neon accents and dynamic haptic feedback that celebrate completion without visual noise.
• High-density habit cards showing streaks, target frequencies, and point potential at a glance.

#### 5. 11 HOLISTIC LIFE CATEGORIES
Craft a balanced daily system across 11 disciplines:
• Foundation: Circadian rhythm and sleep quality
• Physical: Strength training and daily movement
• Cardio: Endurance, zone-2, and heart health
• Mind: Meditation, reflection, and journaling
• Intellect: Books, long-form learning, and coursework
• Skills: Deliberate practice with feedback
• Deep Work: Distraction-free flow states and project sprints
• Language: Daily linguistic retention and vocabulary
• Nutrition: Clean meals and hydration
• Environment: Space tidying and physical sanctuary
• Finance: Daily expense tracking and investment discipline

#### 6. PROOF AUDIT & VERIFICATION GALLERY
• Attach photo proof to quantitative habits (reading pages, completed run logs, tidy desk).
• Inspect proof photos in a shared photo audit gallery to keep duels completely honest.

---

## What’s New in Version 1.0.0

Welcome to the initial public release of Do It!
- Native iOS 17+ SwiftUI architecture with silky 120Hz ProMotion response.
- Complete Apple HealthKit integration for Steps, Workouts, Cardio, and Sleep.
- Head-to-Head Multiplayer Duels with customizable stakes and real-time Supabase sync.
- Interactive Home Screen and Lock Screen widgets for glanceable daily Par scores.
- Signature Linear Dark visual styling and customizable player accent themes.
- Offline-first caching with instantaneous background synchronization.

---

## App Privacy Nutrition Label Declarations

| Data Category | Data Type | Purpose | Linked to Identity? | Used for Tracking? |
| :--- | :--- | :--- | :--- | :--- |
| **Health & Fitness** | Fitness, Sleep, Workouts | App Functionality (Auto-habit completion) | **No** (Stored locally / anonymous duel state) | **No** |
| **User Content** | Photos (Optional Proofs) | App Functionality (Duel accountability gallery) | **No** (Linked only to anonymous user UUID) | **No** |
| **Identifiers** | User ID | App Functionality (Multiplayer duel sync) | **Yes** (Supabase Auth ID) | **No** |
| **Usage Data** | Product Interaction | Analytics / Performance monitoring | **No** | **No** |
| **Diagnostics** | Crash Data | App Performance Optimization | **No** | **No** |

### HealthKit Privacy Notice:
Do It accesses HealthKit data exclusively upon your explicit permission to automate habit completions (e.g., verifying daily step count or workout duration). Your health metrics are never sold, never disclosed to third parties, and never used for advertising or marketing purposes.

---

## Support & Regulatory Links

- **Support URL:** `https://do-it.app/support`
- **Marketing URL:** `https://do-it.app`
- **Privacy Policy URL:** `https://do-it.app/privacy`
- **Terms of Service:** `https://do-it.app/terms`
