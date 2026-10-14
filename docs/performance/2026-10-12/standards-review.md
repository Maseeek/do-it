# Standards Review (Commit 69d22fe)

## Documented Standards
**0 hard violations.** The diff strictly follows repository guidelines:
- **`AGENTS.md` & `docs/agent-workflow.md`**: No prohibited mutations, lockfile modifications, or credential leaks. Scoped strictly to authorized performance requirements.
- **`ts-best-practices`**: Strongly typed. Count validation in `src/lib/duel-sync.ts:18` uses `Number.isInteger(count) && count >= 0` rather than loose truthiness. External Supabase responses preserve proper error handling (`if (error) throw error`). Unboxing via `row.data as T` preserves existing generic interface consistency.
- **`react-best-practices`**: Deferred views (`src/components/DeferredView.tsx`) consume stable immutable snapshots via `useSyncExternalStore` without effect synchronization anti-patterns.
- **`principle-laziness-protocol`**: The concurrency enhancement in `duel-sync.ts` implements bounded parallel requests (batch limit 3) directly without inventing an unneeded generic task scheduler. Shared `queryRange` helper deduplicates range query construction.

---

## Smell Baseline (Judgement Calls)

### 1. Duplicated Code
- **`src/lib/duel-sync.ts:59-62, 79-82`**
  ```ts
  rows.push(...batchData.map(row => row.data as T));
  offset += batchData.length;
  if (rows.length >= totalCount) return rows;
  ```
  The row unwrapping, offset advance, and completion threshold checks are duplicated verbatim across the parallel batch collector and serial fallback loop. A small local helper (e.g. `appendPage(data)`) would centralize pagination termination and buffer appending.
- **`src/components/HabitCard.tsx:28` & `src/components/TodayView.tsx:27`**
  `createDeferredView` is invoked independently in both modules for `ProofGalleryModal`. Creating and exporting a shared deferred component directly in `ProofGalleryModal.tsx` would consolidate loading and cache state.

### 2. Mysterious Name
- **`src/lib/duel-sync.ts:29`**
  ```ts
  const stride = data.length;
  ```
  `stride` stores the discovered first-page size. `effectivePageSize` or `pageSizeStride` would more accurately describe its semantic role in speculative offset calculations.

### 3. Speculative Generality
- **`src/lib/deferred-resource.ts:10`**
  ```ts
  activate: (load: () => Promise<T>) => Promise<T> = loadCurrentPage
  ```
  The `activate` strategy parameter exists solely for test mocking and is unused in production callers.

### 4. Data Clumps
- **`src/lib/score-calculator.ts:379-385`**
  `calculateHabitStreak` accepts `(checkIns, restDays, today, indexed)` as a clump where `checkIns` is bypassed when `indexed` is present.
