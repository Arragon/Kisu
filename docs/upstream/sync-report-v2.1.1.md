# Integration health report — v2.1.1 (UP-03 / INH-1215)

- Date: 2026-10-28
- Sync branch: `upstream-sync/2026-10-28` (merge commit 248f7e7, stacked on the
  M1 chain tip feat/DES09-a11y-polish = 480f89c until #68–#74 merge; then on next)
- Integrated baseline: **v2.1.1** = tag a55d1a3 (commit a1279f2, fishjar PR #1174)
- Procedure: docs/upstream/sync-procedure.md; pre-verified resolutions:
  docs/upstream/sync-rehearsal-v2.1.1.md

## Numbers

| Metric | Value |
| --- | --- |
| Conflicts | 10 (9 predicted by the rehearsal + 1 add/add: TranForm.test.js, EU-004 carrier) |
| Conflict hotspots | src/subtitle/* (EU-001/KP-001), src/views/Action/Draggable* (EU-003), src/views/Selection/Tran* (EU-004), src/views/Options/Subtitle.js (EU-001) — every hotspot was an EU cherry-pick copy vs upstream original, no semantic divergence |
| Files changed by the integration | 397 (239 added / 158 modified / 0 deleted) |
| TRACK-owned LOC carried | KP-001 only: ~10 net lines in YouTubeCaptionProvider.js + snapshot-test describe block |
| Carried patches | 1 active (KP-001, re-applied & revalidated); 4 obsolete (EU-001..004, all verified ancestors of v2.1.1) |
| KCL changes | none |
| Semantic changes | none (surfaces-layer untouched by the merge; KCL injected accessors stayed transparent through the storage refactor, as the rehearsal predicted) |
| Ownership boundary adjustment | not needed — conflict surface shrank to zero after EU retirement |

## Verification sequence (sync-procedure.md)

1. Upstream tests: ✅ 265 suites / 4227 tests **all passing** on the merged tree
   (pre-sync baseline failures BL-01/02/04 were resolved by upstream evolution).
   Includes KCL contract tests and settings migration tests.
2. build:chrome: ✅ completed successfully.
3. Primary-flow browser smoke / YouTube SPA smoke: ⏳ deferred to UP-03b
   (INH-2162, TRACK entry wiring) — smoke requires Kisu UI mounted in a real build.
4. Carried patch revalidation: ✅ KP-001 re-applied + revalidated (see
   carried-patches.md revalidation log); EU-001..004 → obsolete.

## Notes

- `upstream` remote is not configured in this environment (sync-procedure caveat);
  the baseline was fetched once via URL and verified per the procedure's
  show-ref requirement (refs/tags/upstream-v2.1.1 = a55d1a3).
- EU retirement is recorded in baseline.json; branch policy note updated.
