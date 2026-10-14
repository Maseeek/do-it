# Supabase egress reduction

Issue #65. Reconciled with main after PR #64 (f645415). Existing check-ins, proofs and historical scores remain in their existing tables.

## Changes

1. The store synchronizes a cursor and changed records through `sync_duel`. Realtime subscribes to the small `duel_sync_heads` table. Each browser has at most one sync read in flight; a burst schedules one read and at most one follow-up. Profile changes update presentation independently.
2. Metadata reads omit `proofUrl` and `proofUrls` in PostgreSQL before sending responses. Counts preserve proof buttons and badges. Visible previews and opened galleries resolve photos through an authorized RPC, sharing a request per check-in and proof version. Existing photos remain in PostgreSQL. New uploads still use the existing compression limit; moving images to another storage service is unnecessary for these savings.
3. Polling pauses while hidden or offline. Disconnected realtime uses a small delta check, starting at 30 seconds. Failures back off to five minutes. Connected realtime also reconciles every five minutes to recover missed events. Repeated signals cannot bypass failure backoff.
4. IndexedDB stores metadata and the cursor, isolated by Supabase project, account and Duel. Reopening downloads changes, including tombstones. Complete historical metadata remains available for lifetime Karma, streaks, badges, calendar and activity search. History images load only when visible. Initial metadata loads deliberately include all history rather than silently truncating score inputs.
5. Check-in writes merge supplied fields and deduplicate IDs into batches. Omitted photos and unknown existing fields remain intact. Weekly wearable queries filter the actual calendar week and use metadata; changed points save together. Transaction locks precede authenticated statement tuple locks and service check-in RPC writes.

## Verification

`npm run check` includes typecheck, lint, 164 domain/synchronization tests and an isolated PostgreSQL migration suite. The database suite applies the migration twice, compares the original record, verifies photo-preserving note/point edits, checks partner/outsider RLS, rollback, deletion/reinsertion and cursor resets. PGlite validates PostgreSQL behavior in one session; it does not establish hosted multi-session load capacity.

`tests/egress-browser.cjs` runs the production browser against a disposable PostgreSQL fixture and a local HTTP adapter for Supabase request shapes. Playwright handles the local realtime test transport. It uses synthetic accounts and data, never production tokens or records.

Initial browser fixture results with 731 historical check-ins:

| Operation | Response/request evidence |
| --- | --- |
| First metadata synchronization | 147,461 response bytes; no embedded image data |
| Unchanged reopen | 45 sync response bytes, plus 324 bytes of account metadata |
| Open proof gallery | One authorized photo request, 118 response bytes |
| Twenty realtime signals | One sync request, 327 response bytes for the changed record |

The separate large-photo SQL fixture contains 491,566 bytes of duplicated proof text. Its initial metadata response is 351 bytes; an unchanged delta is 43 bytes. These are synthetic response bodies, not billed egress measurements. Warm offline behavior, a real UI note edit, profile-only updates, stale-read/write overlap and remote deletion are covered by the browser runner. Browser measurements are saved to `.scratch/egress/browser.json` and screenshots to the same directory.

To reproduce the browser check, build with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54421` and a synthetic `NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture-public-key`, start on port 54420, then run `node tests/egress-browser.cjs`. Supply `PLAYWRIGHT_MODULE` if Playwright is installed outside the repository. Restore real build configuration before deployment.

## Rollout

1. Apply `supabase/egress.sql` through the authorized project's SQL Editor after the existing Duel and extras schema. The script is transactional and additive. It creates metadata reads, revision tracking, indexes and patch/proof RPCs. It neither rewrites nor removes existing progress or images. Reapplying it preserves cursors and records.
2. Confirm the SQL transaction succeeds. Deploy the reviewed frontend/server change. Existing clients keep working with the existing schema; newly deployed clients require the new RPCs. Refresh existing app tabs to stop their old full-history subscriptions.
3. Check a proof gallery, a note edit, the partner view and a reopen. Compare database/realtime egress on Supabase's usage page after enough normal activity accumulates.

Applied to Supabase project `jyugbkxnqkvhnevxfphm` through MCP on 2026-10-14, migration `20261014175421_reduce_duel_egress_incremental_sync`. Live verification retained all 118 Check-ins and 10 proof-bearing records with the same complete Check-in digest before and after. An authenticated owner receives all 118 metadata records without photo bytes, all proofs resolve, and an unchanged delta is 48 bytes. An outsider receives no metadata or sync heads; anonymous RPC execution is denied. Realtime publication and RLS are enabled, and the security advisor reports no additional findings. No billing setting or existing progress/proof data was changed. These changes lower future usage; they cannot subtract traffic already counted or clear an existing quota restriction.

Rolling back the application does not require deleting any data or added synchronization tables. The former client can continue using the original tables and proofs. PR #64 is incorporated. PR #62 remains open and also modifies store/profile synchronization.

## Integration verification (2026-10-14)

The conflict resolution keeps delta synchronization and its write-epoch barrier, combines metadata proof counts with the faster badge calculation, and retains the other PR #64 view/history optimizations. Tests for the superseded `fetchDuelRows` loader are removed; delta, deletion, caching, proof, scheduler and SQL/RLS tests exercise its replacement. Type checking, lint, the domain suite and PostgreSQL suite pass. The configured production build and browser fixture pass all recorded flow checks with no page errors. Hosted multi-session load and interactive production checks remain unverified; the Vercel connector returns a team-scope 403 and the deployed app is behind Vercel Authentication.
