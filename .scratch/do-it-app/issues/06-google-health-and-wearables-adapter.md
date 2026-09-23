Type: feature
Status: resolved
Blocked by: none

## Question

How should automated health and fitness wearable sync be implemented so that:
1. Maciek's sleep (8+ hrs) and workout activities (Gym & Basketball/Run) automatically check in via Google Health REST APIs on Google Cloud Platform?
2. Myrna's sleep and running activities automatically check in from Apple Health on iOS without native app store overhead?
3. Both players maintain 1:1 point parity and seamless local-first/Supabase persistence?

## Specification

1. **Maciek (Google Cloud Platform Fitness REST API)**:
   - OAuth 2.0 Web flow requesting offline refresh token with scopes:
     - `https://www.googleapis.com/auth/fitness.sleep.read`
     - `https://www.googleapis.com/auth/fitness.activity.read`
   - Sync route `/api/sync/google-health` queries session endpoints:
     - Sleep (`activityType: 72`): If duration >= 8h, checks in `maciek-sleep` (50 pts).
     - Strength (`activityType: 97`): Checks in `maciek-gym` (40 pts).
     - Cardio (`activityType: 8` running / `10` basketball): Checks in `maciek-sport` (30 pts).

2. **Myrna (Apple Health via iOS Shortcuts Webhook)**:
   - Secure ingestion endpoint `/api/sync/apple-health` with bearer token auth.
   - iOS Shortcut runs on alarm dismissal or workout completion, posting JSON payload.
   - Automatically records completions for `myrna-sleep` (50 pts), `myrna-sport` (30 pts), or `myrna-gym` (40 pts).

3. **Vault Integration UI**:
   - Wearables & Integrations dashboard in Vault Settings (`VaultView.tsx`).
   - Google Health connection state, 1-tap "Sync Now" button, demo simulator.
   - Apple Health webhook URL copy and 60-second shortcut guide.

## Answer

Implemented end-to-end:
1. Google OAuth endpoints `/api/auth/google` and `/api/auth/google/callback` with token cookie lifecycle.
2. Google Health sync endpoint `/api/sync/google-health` querying sessions for sleep and workouts with automatic habit completions and Supabase persistence.
3. Apple Health webhook endpoint `/api/sync/apple-health` accepting authenticated POST requests from iOS Shortcuts.
4. Vault UI enriched with dedicated "Wearables ⌚" sub-tab, connection pills, sync controls, demo simulation, and iOS Shortcuts setup documentation.

