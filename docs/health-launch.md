# Google Health launch steps

Google Health is disabled by default. Leave `GOOGLE_HEALTH_ENABLED` unset or `false` while configuring and testing the integration. Settings shows that manual check-ins remain available. Set `GOOGLE_HEALTH_ENABLED=true` in a preview environment for consented verification, then enable production only after the launch checks below pass.

The code expects `supabase/duels.sql`, `supabase/duels-extras.sql`, then `supabase/health.sql`. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HEALTH_TOKEN_ENCRYPTION_KEY` (32 random bytes, base64), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`, and `CRON_SECRET` on the server. Add `${NEXT_PUBLIC_APP_URL}/api/auth/google/callback` as the Google OAuth redirect URI. Do not put server keys in `NEXT_PUBLIC_` variables.

If the legacy `oauth_tokens` table was deployed, run `node scripts/revoke-legacy-health-tokens.mjs` with server credentials **before** `health.sql`; inspect any failures. The migration deletes that table and removes public legacy profile policies. Existing health users reconnect. Preserve a database backup before migration because legacy profile reads will end.

## Account-only rollout

Keep `GOOGLE_HEALTH_ENABLED=false` and set the server-only `GOOGLE_HEALTH_ALLOWED_USER_IDS` variable to the comma-separated Supabase Auth IDs of the consenting participants. Use the authenticated account ID, not its email, Duel ID, or local `maciek`/`myrna` slot. An empty list leaves the feature disabled. `GOOGLE_HEALTH_ENABLED=true` enables all accounts and must not be used for this restricted rollout.

The allowlist is checked when requesting OAuth, handling its callback, reading connection status, syncing manually, and syncing on a schedule. Accounts outside the list cannot connect or sync; cron skips their existing connections. Disconnect and imported-history deletion remain available to authenticated owners even after access is removed. OAuth state is authenticated and encrypted using the existing token encryption key so its account ID cannot be edited in the browser. OAuth attempts started before this change must be restarted; saved refresh tokens do not need migration.

Save the variables in the intended Vercel environment and redeploy the branch containing the allowlist checks. Add the selected Google accounts to the OAuth test-user list and ensure the redirect URI matches that deployment. Google OAuth Testing refresh tokens expire after seven days, so participants may need to reconnect. A restricted personal rollout does not establish public-launch readiness or authorize billing, publishing changes, or a paid assessment.

Verify an allowed account can connect and check its selected automatic habits; verify a non-allowed account sees health unavailable and cannot begin OAuth or sync. Also check scheduled sync only processes allowed accounts and removing an ID disables subsequent access. Do not enable the public flag until the launch gates below are resolved.


The public release remains gated on:

- Real iPhone and Android consented accounts, including Apple Health and Health Connect sharing through Google Health. Verify exactly which Strava and Hevy metrics arrive; no assumed compatibility claims.
- Two-account isolation, manual precedence, duplicate workouts, corrected and delayed steps, travel time zones, permission revocation, and failed scheduled checks.
- Google OAuth app verification and any required security assessment, plus the app privacy policy and retention terms.

Google API references: [reconciled records](https://developers.google.com/health/endpoints), [daily steps](https://developers.google.com/health/data-types/steps), [verification](https://developers.google.com/health/app-verification).
