# Carried patches

Any modification to TRACK-owned upstream code that cannot be avoided is a **carried patch**.
Carried patches exist so that Kisu's diff against TRACK-owned code stays small, explicit
and independently revertible.

Authority: `KISU-ARCHITECTURE-v2.md` section 5, `KISU-ROADMAP-v2.md` P1-T07.

Health metric for this file is not the number of patches Kisu ships. It is:

> **How much TRACK-owned upstream code does Kisu carry, and how deep are those changes?**

## Status values

| Status | Meaning |
| --- | --- |
| `proposed` | Identified as necessary by control-path tracing. Not reviewed by L4, not coded. |
| `active` | Reviewed, implemented, currently carried. |
| `upstreamed` | Contributed to KISS; Kisu no longer carries it. |
| `obsolete` | No longer required — upstream now provides an equivalent hook. |

## Rules

- Product/UI work must not hide modifications to upstream core.
- Each patch must be narrow and independently revertible.
- If a patch is generically valuable to KISS, prefer upstreaming it over carrying it.
- If patch count or depth keeps rising, trigger an architecture review before the next release.
- A `proposed` patch must be reviewed by L4 before any coding starts.

---

## KP-000 — registry template

Use this block shape for every new entry.

```text
ID:
Status:
Why required:
Upstream-owned files touched:
Kisu consumer:
Could be upstreamed generically:
Removal condition:
Tests:
Last revalidated against:
```

---

## KP-001 — Export a subtitle runtime accessor

```text
ID: KP-001
Status: active
Why required:
  The YouTube subtitle subsystem is a closure singleton. YouTubeInitializer keeps an
  `initialized` guard (src/subtitle/YouTubeCaptionProvider.js:1020-1031) and the provider
  instance is never attached to `window` or `globalThis`. There is no public handle.
  As a result Kisu cannot read subtitle state at all from outside. Of the seven intended
  KCL subtitle intents, `getSubtitleState()` is not implementable without an upstream
  accessor. See docs/architecture/control-paths.md path 3.
Upstream-owned files touched:
  src/subtitle/YouTubeCaptionProvider.js — read-only `getStatusSnapshot()` class method
    (~10 net code lines, no behavior change) + module-level instance reference and
    exported `getYouTubeCaptionStatus()` accessor; snapshot is frozen, exposes no
    instance or mutable reference, provides no write path (ADR-011).
  src/subtitle/YouTubeCaptionProvider.test.js — snapshot tests only, no upstream
    assertions changed.
Kisu consumer:
  src/kisu/kcl/subtitleRuntime.js — readSubtitleRuntime() (accessor injected by the
    Kisu content bootstrap; KCL does not statically import src/subtitle/*, see BL-04).
    Settings-level reads remain src/kisu/kcl/subtitles.js (MVP-10).
Could be upstreamed generically:
  Yes. A read-only accessor for the active subtitle provider is a reasonable generic
  addition and should be proposed upstream first.
Removal condition:
  Upstream exports an equivalent public accessor.
Tests:
  "KP-001 status snapshot accessor" (YouTubeCaptionProvider.test.js): snapshot is
  frozen with the documented shape; exported accessor returns null before
  initialization and a live snapshot after mount; snapshot reflects a
  yt-navigate-finish SPA navigation without a stale or null instance.
  KCL wrapper covered in src/kisu/kcl/__tests__/subtitleRuntime.test.js.
Implemented: 2026-10-25 (M0 rebuild; original ADR-011 text lost — decision re-derived
  from the INH-1228 design-evidence comment, see docs/architecture/decisions.md).
Last revalidated against:
  v2.1.1 (a1279f2) on upstream-sync/2026-10-28 (248f7e7) — UP-03 integration
```

## KP-002 — Extend `updateSetting` to cover provider, language and enabled

```text
ID: KP-002
Status: proposed
Why required:
  YouTubeCaptionProvider.updateSetting({name, value}) (YouTubeCaptionProvider.js:320)
  already handles isBilingual, displayOrder, blurTranslation, segSlug, aiContextSlug and
  autoTranslate. It has no branch for apiSlug, toLang or enabled. Those three are read
  only once at startup (src/subtitle/subtitle.js:30, :46), so changing them at runtime
  has no effect. This blocks setSubtitleProvider(), setSubtitleTargetLanguage() and
  setSubtitleEnabled().
Upstream-owned files touched:
  src/subtitle/YouTubeCaptionProvider.js (extend updateSetting branches)
Upstream-owned files read:
  src/subtitle/subtitle.js (startup resolution of apiSetting)
Kisu consumer:
  src/kisu/kcl/subtitles.js — setSubtitleProvider(), setSubtitleTargetLanguage(),
  setSubtitleEnabled()
Could be upstreamed generically:
  Yes, and arguably upstream would want this anyway — runtime provider/language switching
  is a normal expectation. Propose upstream before carrying.
Removal condition:
  Upstream accepts runtime updates for these fields.
Tests:
  Contract test per field: change value through the intended KCL command, assert the
  manager actually uses it on the next translation, assert the change survives an SPA
  navigation without leaking to the previous video.
Last revalidated against:
  v2.0.32 (7dfc03eb)
```

## KP-003 — Idempotent page translate / stop

```text
ID: KP-003
Status: proposed
Why required:
  The only page translation control is MSG_TRANS_TOGGLE, which routes to Translator.toggle()
  (src/libs/translator.js:3943). A toggle is not idempotent. Kisu product semantics need
  translatePage() and stopPageTranslation() as separate, repeatable intents; implementing
  them on top of a toggle requires a read-modify-write race against an asynchronous state
  read (MSG_TRANS_GETRULE is a one-shot request with no push channel).
  Options: add idempotent entry points upstream, or have KCL compose read-then-toggle and
  accept the race.
Upstream-owned files touched:
  src/libs/translator.js (add enable-explicitly / disable-explicitly entry points)
  or none, if KCL composition is accepted
Kisu consumer:
  src/kisu/kcl/page.js — translatePage(), stopPageTranslation()
Could be upstreamed generically:
  Yes. Explicit enable/disable alongside toggle is a small, generic additions.
Removal condition:
  Upstream provides idempotent enable/disable, or Kisu accepts documented KCL composition.
Tests:
  Call translatePage() twice — assert one translation, no duplicate DOM work. Call
  stopPageTranslation() on an idle page — assert no state change and no error.
Last revalidated against:
  v2.0.32 (7dfc03eb)
```

## KP-004 — Page state change notification

```text
ID: KP-004
Status: proposed
Why required:
  Page translation state is pulled, never pushed. The Popup reads it once via
  MSG_TRANS_GETRULE when it opens (src/views/Popup/index.js:191) and otherwise relies on
  optimistic local React updates. There is no subscription, so a Kisu surface cannot
  reflect state changed by another surface, a keyboard shortcut, the toolbar icon or the
  context menu.
Upstream-owned files touched:
  src/libs/translator.js, src/libs/translatorManager.js (emit on state change)
Kisu consumer:
  src/kisu/kcl/page.js — subscription to page state
Could be upstreamed generically:
  Yes.
Removal condition:
  Upstream emits a page-state change event.
Tests:
  Trigger translation from a non-Kisu entry point (shortcut or toolbar) and assert the
  Kisu surface updates without being reopened.
Last revalidated against:
  v2.0.32 (7dfc03eb)
```

---

## Revalidation log

Record every revalidation pass, including passes where nothing was removed.

```text
Date: 2026-09-13
Baseline: v2.0.32 (7dfc03eb)
Patches reviewed: KP-001, KP-002, KP-003, KP-004 (all newly proposed)
Outcome: proposed only, no code carried. No patch has been implemented.

Date: 2026-10-25
Baseline: v2.0.32 (7dfc03eb) + EU-001..004 on next@m0-start (6037227)
Patches reviewed: KP-001 (proposed → active)
Outcome: KP-001 implemented as the narrowed read-only accessor (getStatusSnapshot +
  getYouTubeCaptionStatus, ~10 net code lines in YouTubeCaptionProvider.js, snapshot
  tests in its test file). Original ADR-011 approval evidenced by the INH-1228
  design comment; text re-derived in docs/architecture/decisions.md.
  KP-002/KP-003/KP-004 remain proposed (D3/D4 decisions still open for 002/004).

Date: 2026-10-25 (second pass, MVP-46 divergence audit / INH-1187)
Baseline: v2.0.32 (7dfc03eb) + EU-001..004 on next@m0-start (6037227)
Patches reviewed: KP-001 (active, revalidated), KP-002/KP-003/KP-004 (proposed, unchanged)
Outcome: evidence-based diff of the whole subtitle-domain TRACK surface vs m0-start:
  src/subtitle/YouTubeCaptionProvider.js +39/-3 and its test +72 — exactly the KP-001
  hunks (getStatusSnapshot + getYouTubeCaptionStatus + snapshot tests); no other
  TRACK change in src/subtitle/*, src/injectors/*, injector-subtitle.js.
  Zero algorithm copying: no src/kisu file imports src/subtitle/* or segmentation/
  queue internals (subtitleRuntime.js grep hit is comment text only); segmentation,
  translation queue and rendering are REUSE via the KP-001 read-only snapshot +
  upstream execution paths. KCL subtitle semantics: read-only snapshot (KP-001) +
  next-load commands (PRs #9/#10) — no real-time channel, live switching deferred
  to KP-002 + D3. Verdict: divergence confined to KP-001 as registered; no
  unregistered TRACK modification; audit PASS.

Date: 2026-10-28 (UP-03 v2.1.1 integration / INH-1215)
Baseline: v2.1.1 (a1279f2) on upstream-sync/2026-10-28 (248f7e7)
Patches reviewed: KP-001 (active, revalidated & re-applied), KP-002/KP-003/KP-004
  (proposed; still required — upstream shows no runtime updateSetting branches, no
  idempotent enable/disable, no state-change event in v2.1.1; line references
  shifted, full re-review queued for UP-04)
Outcome: provider .js auto-merged keeping getStatusSnapshot/getYouTubeCaptionStatus
  (upstream refactored the same file without touching the accessor region — no
  equivalent hook added, KP-001 remains required). Test file resolved to upstream
  side + KP-001 snapshot describe block re-applied (upstream evolved the file
  heavily; snapshot tests green on v2.1.1). Merged tree: 265 suites / 4227 tests
  ALL PASSING. EU-001..004 all verified ancestors of v2.1.1 → retired as obsolete
  (baseline.json updated). KP-005 (entry wiring, INH-2162) planned as the next
  TRACK patch, to be registered on implementation.
```
