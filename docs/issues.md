# Issues and open work

Running record of open problems, deferred work and current progress.

Last updated: 2026-09-13 (offset noted as +08:00, i.e. 2026-09-12 evening UTC).

Related documents: `KISU-ROADMAP-v2.md`, `docs/upstream/baseline.json`,
`docs/upstream/carried-patches.md`, `docs/architecture/control-paths.md`.

---

## Progress

| Roadmap task | State | Artefact |
| --- | --- | --- |
| P0-T01 fork/remotes/baseline metadata | done | `docs/upstream/baseline.json`, `README.md` |
| P0-T02 upstream build/test baseline | **shelved** | — |
| P0-T03 ownership registry | done | `docs/upstream/ownership.md` |
| P0-T04 intake and carried-patch templates | done | `docs/upstream/intake/TEMPLATE.md`, `carried-patches.md`, `sync-procedure.md` |
| P0-T05 three critical control paths | done | `docs/architecture/control-paths.md` |
| P1 onwards | blocked, see item 3 | — |

Branch state:

- `main` = stable `v2.0.32` baseline plus governance documents. No code intakes.
- `next` = `main` plus EU-001 through EU-004.
- `dev` (origin only) = legacy pre-re-baseline content, kept for provenance.

---

## Item 3 — P0-T02 shelved: no upstream build/test baseline

**Status:** deliberately deferred, not blocked.

**Problem.** P0-T02 requires running `pnpm install`, the existing test suite, and the
Chrome and Firefox builds against the untouched baseline, then recording which failures
predate Kisu. Until that exists, there is no way to distinguish a Kisu regression from a
pre-existing upstream failure — which is the exact purpose of the task.

**Why deferred.** It installs a large dependency tree and runs full builds. That is a
heavy, environment-mutating operation and was not started without an explicit go-ahead.

**Consequence of deferring.** The four exceptional intakes (item 2) are carried
**without runtime verification**. They were cherry-picked cleanly and their diffs were
inspected, but no test has been executed against them. This is the largest unverified
assumption in the repository right now.

**To close it.**

```bash
pnpm install
pnpm test -- --runInBand
pnpm build:chrome
pnpm build:firefox
```

Also run the subtitle-specific tests. Then record pass/fail, known failures, build result,
Node/pnpm versions and platform in `docs/upstream/baseline-tests.md`.

**Escalate to L4 if** the baseline cannot build for reasons implying an unclear upstream
environment requirement, or if a failure looks data-destructive or security-relevant.

---

## Item 2 — Exceptional upstream intake: 4 of 44 taken

**Context.** The baseline is `v2.0.32`. Upstream `dev` was 44 commits ahead at the time of
review. Per ADR-003 the remaining 40 are **not** integrated.

**Taken**, all carried on `next` only, each cherry-picked with `-x` so the originating
upstream commit is preserved in the message:

| ID | Upstream | PR | What it fixes | Core flow |
| --- | --- | --- | --- | --- |
| EU-001 | `ca4ea90` | #1045 | Subtitle position resets on every video | YouTube |
| EU-002 | `f5f543a` | #1051 | Unsupported parameter sent to Gemini 3.x non-lite flash | provider |
| EU-003 | `02d362e` | #1061 | Floating button disappears when viewport-crossing coordinates overflow | selection |
| EU-004 | `c95bd46` | #1050 | BuiltinAI translation failed outright with `fromLang=auto`; also a stale detection race | provider + selection |

Rationale for choosing exactly these: each is a user-visible defect in, or directly
adjacent to, one of the three declared core flows, and each has a small, self-contained
diff. Full record in `docs/upstream/baseline.json` under `exceptionalUpstreamPatches`.

**Not taken, and why.**

- Roughly 20 of the 40 are the `hold-to-translate` feature (hold left mouse button to
  translate). Section 3.2 of the architecture names this exact capability as a FILTER
  example: the supporting code should arrive with a stable baseline and Kisu then decides
  whether to expose it. Taking it early would mean adopting product surface before the
  product decision exists.
- `226e578` unifies the UI to Material 3. It is a wide-reaching UI rewrite, not a fix.
- `8e1be70` visual rule editor, `4c8f09e` LaTeX rendering, `9bf5329` runtime subtitle
  service selection and others are capabilities, not defects. They belong in an intake
  review, not an exceptional early intake.
- The remaining fixes are low-impact (typo, i18n label tidying) or unreachable in Kisu's
  three flows.

**Open question.** Whether any of the remaining 40 should also be taken early. Current
position: wait for the next stable release and evaluate the full set through a normal
intake review, using `intake/TEMPLATE.md`.

**Also unverified.** Cherry-picks applied cleanly, but `EU-004` auto-merged
`src/apis/index.js`. Clean application is not correctness.

---

## Item 3 — P1 is blocked on upstream access

Derived from `docs/architecture/control-paths.md`. This is the most consequential finding
in the repository.

Upstream exposes almost no intent-level API, and the three paths fail the clean-wrap test
in three different ways:

| Path | Obstruction |
| --- | --- |
| Page | Mechanism exists but semantics are wrong: `toggle()` is not idempotent, and state is pull-only with no subscription |
| Selection | The word-vs-sentence and dictionary-vs-translation decision is inline and unexported in `views/Selection/TranForm.js` render logic |
| Subtitle | The subsystem is a closure singleton with no handle; `updateSetting` has no branch for `apiSlug`, `toLang` or `enabled` |

Consequences:

- **P1-T06 and P1-T07 cannot start as written.** They need KP-001 (export a subtitle
  runtime accessor) and KP-002 (extend `updateSetting`) first. Both are registered as
  `proposed` in `docs/upstream/carried-patches.md` and have **not** been coded.
- **P1-T05 needs an L4 decision.** Kisu must not copy the selection decision logic, but no
  upstream function exposes it. Either the logic is re-derived by Kisu as a FILTER concern,
  or an upstream hook is added. This decision should be taken before P1-T05 starts.
- **Page write intents** are only implementable via read-modify-write composition
  (KP-003) or an upstream change.

**Recommended next action.** Propose KP-001 and KP-002 upstream to `fishjar/kiss-translator`
before implementing them locally. Both are small generic improvements (a read-only accessor
and three extra `updateSetting` branches) and upstream may well accept them. Upstreaming
avoids carrying them permanently.

---

## Item 4 — Documentation issues

### 4.1 Control-path line references drift on `next`

`docs/architecture/control-paths.md` records `file:line` references against the un-patched
`v2.0.32` baseline. The four exceptional intakes modify twelve non-test files, so line
numbers inside those files shift on `next`:

```text
src/apis/index.js                            src/apis/trans.js
src/config/api.js                            src/config/i18n.js
src/config/setting.js                        src/subtitle/BilingualSubtitleManager.js
src/subtitle/YouTubeCaptionProvider.js       src/subtitle/subtitle.js
src/views/Action/Draggable.js                src/views/Options/Subtitle.js
src/views/Selection/TranCont.js              src/views/Selection/TranForm.js
```

References into those files are exact on `main` and approximate on `next`. Every reference
also names the symbol, so re-locate by symbol rather than by line on `next`.

Affected references of note: the selection decision logic in `TranForm.js` (recorded at
lines 179-235), the subtitle state and settings table, and the `apiTranslate` entry points
in `src/apis/index.js`.

**To fix properly:** re-derive the affected references once the intake set is settled.
Do not silently trust the current numbers on `next`.

### 4.2 The architecture document reuses the `KP-` prefix for two different concepts

Section 5 uses `KP-nnn` for Kisu-carried patches (Kisu's own modifications to TRACK-owned
code). Section 4.7 uses `KP-nnn` in its example for `exceptionalUpstreamPatches` (upstream
commits taken early). These are different things.

**Resolution taken:** split the id spaces. `EU-nnn` for exceptional upstream intake,
`KP-nnn` for Kisu-carried patches. Recorded in `baseline.json` under `namingConvention`.
This deviation from the architecture document is deliberate and should be reflected back
into the architecture document when it is next revised.

---

## Item 5 — Watch items

| Item | Risk | Trigger to act |
| --- | --- | --- |
| Upstream unifying to Material 3 (`226e578`, unreleased) | Architecture section 12 plans to keep legacy KISS surfaces as fallback; that work rewrites `src/views/*` | Re-evaluate section 12 when it reaches a stable release |
| Caption discovery fragility | Depends on regex-extracting `ytInitialPlayerResponse` and an XHR interceptor that does not hook `fetch` | Any user report of subtitles failing to load |
| Git ref persistence anomaly | `git fetch` and `git update-ref` silently fail to persist nested refs; fetch output cannot be trusted | Confirm on a normal terminal whether this is environmental |
| `MSG_TRANS_CURRULE` appears dead | A future KCL design might wrongly depend on it | Confirm reachability from other build variants |

---

## Unconfirmed, needs real-browser verification

Do not let a KCL contract depend on these until verified:

1. Whether the YouTube subtitle control-bar observer and button rebind correctly after an
   SPA navigation rebuilds the control bar.
2. The exact failure mode of `aiSegment` when given a non-AI provider slug.
3. Whether `tranboxSetting` has any live update channel while the selection box is mounted.
4. Whether the four exceptional intakes behave correctly at runtime.
