# Google Play Store Listing & Compliance Specification: Do It

## Store Listing Metadata

| Field | Value | Character Limit |
| :--- | :--- | :--- |
| **App Title** | `Do It: Habit Tracker & Duels` | 28 / 30 chars |
| **Short Description** | `Track habits, duel friends with stakes, and auto-sync Google Health Connect.` | 76 / 80 chars |
| **Category** | Health & Fitness | Play Console Category |
| **Content Rating** | Everyone (IARC certified) | Rating Standard |
| **Package Name** | `com.doit.android` | Application ID |
| **Privacy Policy URL** | `https://do-it.app/privacy` | Mandatory |

---

## Full Description (Google Play Formatted)

<b>Do It is a high-speed, minimalist habit tracker and head-to-head accountability platform engineered for daily discipline.</b>

Tired of clunky habit trackers filled with bloated animations and friction? Do It combines a focused Linear Dark interface, instant 1-tap logging, and native <b>Google Health Connect</b> background automation so you can spend less time managing habits and more time executing them.

---

### 🔥 KEY FEATURES

<b>1. HEAD-TO-HEAD DUELS & REAL STAKES</b>
• Challenge friends, partners, or rivals to weekly or monthly accountability battles.
• Put real stakes on the line: loser cleans the kitchen, buys dinner, or donates to charity.
• Real-time scoreboards, live parity meters, and duel history keep everyone honest.

<b>2. GOOGLE HEALTH CONNECT AUTOMATION</b>
• Zero-friction habit completion powered by Google Health Connect.
• Automatically verify daily steps (6k, 10k, 14k goals) from Google Pixel Watch, Samsung Health, or Garmin.
• Automatically check off strength training and cardio sessions when your health tracker records 20+ minutes.
• Sync sleep milestones automatically without manual logging.

<b>3. 11 HOLISTIC PILLARS OF EXCELLENCE</b>
Curate a comprehensive daily system across 11 disciplines:
• <b>Foundation:</b> Sleep schedule, circadian rhythm, rest targets
• <b>Physical:</b> Strength workouts, functional bodyweight, active steps
• <b>Cardio:</b> Running, cycling, zone-2 endurance sessions
• <b>Mind:</b> Mindfulness, daily reflection, mental resets
• <b>Intellect:</b> Reading books, structured educational modules
• <b>Skills:</b> Deliberate practice with iterative feedback
• <b>Deep Work:</b> Laser-focused blocks without distraction
• <b>Language:</b> Daily vocabulary, conversational repetition
• <b>Nutrition:</b> Clean meals, balanced macros, hydration
• <b>Environment:</b> Workspace organization, sanctuary decluttering
• <b>Finance:</b> Expense tracking, investing, budget discipline

<b>4. INSTANT LOGGING & OFFLINE-FIRST PERFORMANCE</b>
• Built with modern Jetpack Compose for fluid 120Hz scrolling.
• Instant optimistic updates: check off a habit in under 50ms.
• Offline-first synchronization ensures your streaks are safe whether you are in the gym basement or on an airplane.

<b>5. PROOF PHOTO VERIFICATION</b>
• Attach quick photo evidence for quantitative habits (reading page counters, clean desk, running split).
• Duel opponents can inspect evidence in the shared duel photo stream.

<b>6. STRIKING LINEAR DARK AESTHETIC</b>
• Deep obsidian dark mode tailored for OLED battery savings.
• Crisp glowing neon accents and responsive tactile haptics.
• Android 13+ Material You themed icons that dynamically match your wallpaper theme.

---

## Health Connect Policy Declaration & Permission Justification

In compliance with Google Play’s **Health Connect Developer Policy**, Do It declares the following data permissions and technical justifications:

### Declared Permissions
1. `androidx.health.permissions.READ_STEPS`
   - **User-Facing Justification:** Reads daily aggregate step counts to verify user-defined physical step milestones (e.g., 10,000 daily steps) without manual entry.
2. `androidx.health.permissions.READ_EXERCISE`
   - **User-Facing Justification:** Detects workout sessions (session start time, duration, exercise type) to automatically mark "Workout" (20+ minutes) and "Cardio Session" habits as complete.
3. `androidx.health.permissions.READ_SLEEP`
   - **User-Facing Justification:** Detects sleep duration to verify foundation sleep goals (e.g., 8.5 hours restorative sleep) upon waking.

### Strict Data Privacy & Governance Guarantees
- **No Third-Party Transfer:** Health Connect data is never transferred, sold, or licensed to data brokers, ad networks, or analytics providers.
- **Limited Scope Use:** Data is accessed strictly on-device to compute boolean completion of user-configured habits.
- **Encryption Standards:** All synced habit states are encrypted in transit via TLS 1.3 and encrypted at rest (AES-256).
- **Data Deletion:** Users can revoke Health Connect access at any time via Settings or disconnect and wipe all synchronized habit logs via one-tap account deletion.
- **Prominent Disclosure:** Prior to requesting Health Connect permissions, Do It presents an explicit modal explaining which metrics will be accessed and why.

---

## Store Graphics Specifications

### 1. App Icon
- **Dimensions:** 512 x 512 pixels
- **Format:** 32-bit PNG (with alpha or solid dark background)
- **Max File Size:** 1,024 KB
- **Source File:** `shared-mobile-assets/ic_launcher-512.png`

### 2. Feature Graphic
- **Dimensions:** 1,024 x 500 pixels
- **Format:** 24-bit PNG or JPEG (no alpha channel)
- **Max File Size:** 15 MB
- **Visual Composition:**
  - Base: Deep obsidian canvas (`#08090A`) with subtle radial gradient (`#131722`)
  - Center emblem: High-res neon lightning bolt icon with electric cyan (`#38BDF8`) to indigo (`#6366F1`) glow
  - Typography: Minimalist bold "Do It" wordmark (SF/Inter style) and subhead "Habit Duels & Streaks"
  - Safety margins: All critical text and logos kept within the center 800 x 400 safe area (avoiding cutoffs on varying device form factors).

### 3. Phone Screenshots (Min 4, Recommended 6)
- **Aspect Ratio:** 9:16 portrait
- **Resolution:** 1080 x 2400 pixels
- **Shot 1:** Today View – Daily Par progress ring, lightning fast habit check-off, category pills.
- **Shot 2:** Head-to-Head Duel – Live score margin, partner comparison, stake challenge banner.
- **Shot 3:** Health Connect Automation – Instant badge indicating verified sleep and workout steps.
- **Shot 4:** Proof Gallery – Photo proof submission showing accountability streak.
- **Shot 5:** Habit Catalog – Balanced 11-category life architecture with custom point distributions.
- **Shot 6:** Theme Customization – Obsidian Linear Dark with glowing neon accents.

### 4. 7-inch & 10-inch Tablet Screenshots
- **Resolution:** 1200 x 1920 (7-inch) and 2048 x 1536 (10-inch)
- Shows wide two-column tablet layout featuring simultaneous Today view and Duel sidebar.

---

## Data Safety Section Questionnaire Mapping

| Question | Value | Details |
| :--- | :--- | :--- |
| **Does your app collect or share user data?** | **Yes** | User account ID, habit logs, optional proof photos |
| **Is all user data encrypted in transit?** | **Yes** | Enforced TLS 1.3 for all Supabase API endpoints |
| **Can users request data deletion?** | **Yes** | In-app "Delete Account & Data" button + web request form |
| **Health and Fitness Data collected?** | **Yes** | Steps, exercise sessions, sleep (Read-only via Health Connect) |
| **Is Health data shared with third parties?** | **No** | Never shared or commercialized |
| **Is Health data used for ads?** | **No** | Absolutely prohibited |
| **Photos and Videos collected?** | **Yes (Optional)** | Only when user snaps a proof photo for a habit |
