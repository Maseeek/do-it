# Overnight Performance Run Decision Trail Review (Round 4)

**Reviewer Model**: `gemini-3.7-flash-high`  
**Parent Agent**: `gpt-6.1-sol` (T3 Thread `f680d6b6-ccda-4e69-b783-001f03f4f08e`)  
**Coverage Boundary**: Baseline `e7b284e` through commit `400fbfe` (`main`); `decisions.tsv` Rows 1–50 (`00:07:36Z`–`04:29:27Z`).  
**Scope Notice**: Evaluates accepted changes only. Does not grant blanket approval for concurrent or subsequent edits (e.g., in-flight `duel-sync.ts` parallel pagination).

---

### 1. Audit of Claims vs. Durable Receipts

All 50 rows in `docs/performance/2026-10-12/decisions.tsv` were audited against repository artifacts and the parent timeline. All 118 evidence file pointers resolve. Row 48 (`04:18:58Z`) correctly superseded the removed `calculations-r2.test.ts` from Row 10 with `calculation-regressions.test.ts`.

| Row & Timestamp | Phase | Claimed Metric / Action | Verified Receipt | Status / Severity |
|---|---|---|---|---|
| **13** `00:47:17Z` | `loading` | First open: Progress ~33ms, Duel ~40ms, Settings ~30ms | `deferred-first-navigation.json` | Verified (Low) |
| **20, 24** `01:38:59Z` | `sync` | 20-event burst coalesced to 1 reload; 5 exact counts | `authenticated-reload.json` | Verified (Low) |
| **24** `01:43:00Z` | `interact` | Check-in median 48.6→41.4ms; Undo 53.3→45.4ms | `interleaved-interactions.json` | Verified (Low) |
| **27** `01:53:18Z` | `race` | Check-in stays checked across overlapping read/write | `authenticated-race-after.json` | Verified (Low) |
| **28** `01:53:18Z` | `cap` | Retains full 2,500 records under 400-row cap | `authenticated-reload-cap400.json` | Verified (Low) |
| **37** `03:13:41Z` | `preview` | Protected Vercel preview blocked by MCP 403 / unauthenticated CLI | `vercel-whoami.json`, `whoami.log` | Access limitation (Medium) |
| **39, 41** `03:24:55Z` | `entry` | Account 380→81ms; Onboarding 497→197ms; plan saved | `entry-performance.json` | Verified (Low) |
| **45** `04:07:59Z` | `prototype` | Naive parallel dropped 400 rows (850/1250) on shrinking cap; rejected | `pagination-prototype.json` | Verified (Low) |

---

### 2. Methodological Rigor & Bias Corrections

The trail shows exceptional discipline in discarding compromised metrics:
1. **Persistence Polling Bias (Row 22, `01:39:00Z`)**: Discarded timings polluted by repeated 2.3MB JSON state parsing; replaced with one-write observation.
2. **Mock Content-Range (Row 23, `01:43:00Z`)**: Exposed missing headers to eliminate spurious unknown-count fallbacks.
3. **Pagination Quiescence (Row 25, `01:44:24Z`)**: Fixed premature completion checks across 400-row query gaps.
4. **Locator Quantization (Row 38, `03:20:56Z`)**: Replaced 864ms locator retry waits with in-browser readiness probes.
5. **Short-Page Invariant (Row 45, `04:07:59Z`)**: Promptly rejected naive parallel fetching when shrinking server caps exposed silent data loss.

---

### 3. Acceptance Gaps and Residual Risks

1. **Hosted Infrastructure Limitation vs. Failure (Row 37)**: Preview testing failed due to team SSO/403 and unauthenticated CLI credentials (`vercel-whoami.json`). This is an external access barrier, not code failure, but leaves real-world database latency and RLS unmeasured.
2. **Synthetic Hardware Constraints**: Mobile verification relied on headless Chromium with synthetic 4× CPU throttling and viewport resizing (`repro-interactions-mobile.json`); physical mobile hardware and touch events remain unverified.
3. **Apple Health Removal (Commit `fbc0c76`)**: Deleting the `pullAppleHealthPending` hook was flagged as scope creep, but baseline inspection confirms `/api/sync/apple-health` already returned HTTP 410 at `e7b284e`. Removing dead network traffic preserves wearable invariants while eliminating polling overhead.

---

## Attention

reviewed by gemini-3.7-flash-high
- Row 37 (`03:13:41Z`): Hosted preview remains unverified due to team 403 / CLI credentials; RLS and network latency depend solely on local mock validation.
- Rows 24 & 29: Mobile validation is synthetic (4× CPU throttling, viewport emulation); physical device behavior unmeasured.
- Commit `400fbfe` boundary: Accepted changes are sound, but serial history loading and in-flight cancellation remain open until the concurrent `duel-sync.ts` task finishes and passes separate review.
