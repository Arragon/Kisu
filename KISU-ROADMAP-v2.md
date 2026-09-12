# Kisu — Development Roadmap v2

> Project: **Kisu**  
> Status: executable V0.1 roadmap  
> Date: 2026-08-31  
> Companion: `KISU-ARCHITECTURE-v2.md`  
> Goal of this revision: task granularity suitable for L3/L2 coding models, with explicit upstream governance and UI-style flexibility.

---

# 0. How to use this roadmap

This is not a high-level milestone list. It is a delivery plan that should be decomposable directly into coding-agent tasks.

Each task packet defines:

- task ID;
- recommended model level;
- prerequisites;
- goal;
- allowed scope;
- prohibited scope;
- expected outputs;
- acceptance criteria;
- verification;
- handoff notes.

A coding agent should read:

1. `KISU-ARCHITECTURE-v2.md`;
2. this roadmap;
3. the task packet assigned to it;
4. any referenced control-path or ADR document.

The agent should not reinterpret the whole product.

---

# 1. Model-level policy

The project uses the existing L1–L5 engineering capability scale where higher levels may safely handle more ambiguous and cross-system work.

For this roadmap:

## L5

Use for:

- major architecture changes;
- deciding TRACK/FILTER/OWN ownership transitions;
- changing long-term upstream strategy;
- high-risk security/storage/browser architecture;
- rejecting/reframing a milestone;
- final architecture arbitration.

L5 should not implement routine UI components.

## L4

Use for:

- architecture-to-code boundary design;
- KCL contract design;
- upstream integration strategy;
- cross-module YouTube lifecycle design;
- migration design;
- high-risk review;
- root-cause debugging spanning browser/content/background/subtitle layers.

L4 should produce bounded implementation plans that L3/L2 can execute.

## L3

Primary development model for:

- one bounded KCL module;
- one product feature controller;
- a complete UI surface behavior;
- selection overlay behavior;
- YouTube control integration;
- nontrivial settings mapping;
- component tests;
- debugging within an understood subsystem.

A good L3 task should normally be independently executable from the task packet plus repository context.

## L2

Use for:

- focused components with explicit interfaces;
- semantic token scaffolding;
- small adapters after contract is defined;
- state rendering;
- form fields;
- i18n additions;
- mechanical test cases;
- docs;
- small regression fixes with clear reproduction;
- refactors constrained to named files.

L2 tasks must have narrow file and behavior boundaries.

## L1

Use for:

- formatting;
- simple string changes;
- repetitive documentation maintenance;
- low-risk test-data updates.

Do not route product-state decisions to L1.

---

# 2. Task-packet definition of ready

A task may be assigned to L3/L2 only when:

- its user outcome is explicit;
- prerequisites are satisfied;
- input interfaces are known;
- allowed files/areas are named;
- forbidden core areas are named;
- acceptance criteria are observable;
- verification commands are known;
- no unresolved architecture decision remains inside the task.

If one of those conditions is missing, route back to L4 planning.

---

# 3. Global implementation constraints

Every L3/L2 task inherits:

- do not migrate React/build tooling;
- do not add a global state library;
- do not duplicate provider credentials;
- do not copy translator/subtitle algorithms into Kisu;
- do not casually modify TRACK-owned core;
- preserve existing stored settings unless task explicitly includes a migration;
- keep legacy Advanced access;
- use KCL rather than direct upstream schema access from Kisu product surfaces;
- keep visual style details out of feature/domain logic;
- do not freeze a final UI aesthetic before Design Freedom Gate;
- keep changes small enough to review;
- add/adjust tests for changed behavior;
- report any required TRACK-core modification as a blocker unless the task explicitly authorizes a carried patch.

---

# 4. Phase map

```text
P0  Baseline & upstream governance
 ↓
P1  KCL foundation
 ↓
P2  UI behavior boundary & neutral renderer
 ↓
P3  Page translation product flow
 ↓
P4  Selection / dictionary product flow
 ↓
P5  YouTube subtitle product flow
 ↓
P6  Onboarding & Simple Settings
 ↓
DG  Design Freedom Gate — user selects visual direction
 ↓
P7  Visual system implementation & polish
 ↓
P8  Upstream integration rehearsal
 ↓
P9  Release hardening
```

P0–P6 can proceed without a final visual style.

P7 must not freeze styling until the Design Freedom Gate is passed.

---

# 5. P0 — Baseline and upstream governance

## P0-T01 — Establish fork/remotes and baseline metadata

**Level:** L2  
**Prerequisites:** repository fork exists or local clone can be configured.

### Goal

Ensure Kisu can always identify its upstream ancestry.

### Allowed scope

- Git remotes/branches;
- `docs/upstream/baseline.json`;
- `docs/upstream/README.md`;
- documentation only.

### Do not

- change application code;
- cherry-pick arbitrary `dev` commits;
- rename existing source modules.

### Steps

1. Configure `origin` to Kisu fork.
2. Configure `upstream` to `fishjar/kiss-translator`.
3. Create/verify `main` and `next`.
4. Record stable KISS `v2.0.32` and its target commit as the initial candidate baseline.
5. Record currently watched `dev` commit separately.
6. Enable `git rerere` locally and document recommendation.

### Output

`docs/upstream/baseline.json`

Minimum fields:

```json
{
  "kisuVersion": "0.0.0-dev",
  "kissBaseline": {
    "release": "v2.0.32",
    "commit": "7dfc03ebc7f10530681109f6a5aec982a5573936"
  },
  "watchedDev": {
    "commit": "c95bd46bead3a0e5947428f2b3b4ebb193be9207"
  },
  "exceptionalUpstreamPatches": []
}
```

### Acceptance

- baseline is machine-readable;
- stable and watched-dev concepts are separate;
- Git history is preserved.

### Verification

```bash
git remote -v
git branch --show-current
cat docs/upstream/baseline.json
```

---

## P0-T02 — Capture untouched upstream build/test baseline

**Level:** L3  
**Prerequisites:** P0-T01.

### Goal

Know what failures existed before Kisu.

### Allowed scope

- docs;
- test logs/artifacts;
- no behavioral source edits.

### Steps

Run from the stable baseline:

```bash
pnpm install
pnpm test -- --runInBand
pnpm build:chrome
pnpm build:firefox
```

If project scripts require different noninteractive test invocation, use the nearest existing supported invocation and document it.

Also run subtitle-specific existing tests if available.

Record:

- pass/fail summary;
- known failures;
- build result;
- Node/pnpm versions;
- platform.

### Output

`docs/upstream/baseline-tests.md`

### Acceptance

Later regressions can be distinguished from upstream baseline failures.

### Escalate to L4 when

- baseline cannot build for reasons that imply an unclear upstream environment requirement;
- failures appear data-destructive or security-relevant.

---

## P0-T03 — Create ownership registry

**Level:** L2  
**Prerequisites:** architecture document.

### Goal

Make TRACK/FILTER/OWN operational.

### Output

`docs/upstream/ownership.md`

Seed entries for:

- browser/runtime — TRACK;
- translator core — TRACK;
- provider framework — TRACK;
- DOM translation — TRACK;
- storage foundation — TRACK;
- caption acquisition — TRACK;
- subtitle processing — TRACK;
- advanced subtitle capability exposure — FILTER;
- provider exposure — FILTER;
- selection triggers/capabilities — FILTER;
- Popup presentation — OWN;
- Selection presentation — OWN;
- YouTube control presentation — OWN;
- onboarding — OWN;
- Simple Settings — OWN;
- visual system — OWN.

### Acceptance

Every major subsystem touched in V0.1 has an ownership mode.

---

## P0-T04 — Create upstream intake and carried-patch templates

**Level:** L2

### Goal

Make future upstream tracking cheap and consistent.

### Files

```text
docs/upstream/intake/TEMPLATE.md
docs/upstream/carried-patches.md
docs/upstream/sync-procedure.md
```

### Acceptance

Templates contain all fields required by the architecture.

No application code changes.

---

## P0-T05 — Trace three critical upstream control paths

**Level:** L4 planning, may be executed by a strong L3 if repository indexing is good.

### Goal

Produce code maps that downstream L3/L2 tasks can trust.

### Trace

1. Popup/page translation:
   UI → settings/state → command/event → translator.
2. Selection:
   selection detection/trigger → translation/dictionary → provider → result UI.
3. YouTube:
   player lifecycle → caption discovery → processing/segmentation → translation → rendered subtitle.

### Output

`docs/architecture/control-paths.md`

For each path list:

- entry files;
- state/settings fields;
- important functions/classes;
- message/event boundaries;
- likely KCL seam;
- TRACK-owned files that should remain untouched.

### Acceptance

Each later KCL task can name the exact existing upstream mechanism it wraps.

---

# 6. P1 — KCL foundation

P1 should be planned by L4 once P0-T05 exists, then implemented as separate L3/L2 tasks.

## P1-T01 — Define KCL conventions and test harness

**Level:** L3

### Goal

Create the minimal KCL directory and common conventions without building unused abstractions.

### Files

Expected:

```text
src/kisu/kcl/README.md
src/kisu/kcl/version.js
src/kisu/kcl/capabilities.js
```

Only create additional shared helpers if a real upcoming task needs them.

### Requirements

`README.md` must define:

- product code may not import arbitrary upstream schema directly when a KCL mapping exists;
- KCL returns normalized intent-level values;
- KCL does not contain translator algorithms;
- all capability differences must be explicit;
- tests accompany semantic projections.

### Acceptance

No change to runtime behavior.

---

## P1-T02 — Page KCL: read-only state projection

**Level:** L3  
**Prerequisites:** P0-T05, P1-T01.

### Goal

Expose normalized read-only page state.

### Suggested interface

Exact names may be adjusted based on repository reality:

```js
getPageTranslationState()
getPageDisplayMode()
getPageProvider()
getPageTargetLanguage()
getCurrentSitePreference()
```

### Allowed scope

- `src/kisu/kcl/page.*`;
- focused tests;
- narrow imports from existing KISS modules.

### Prohibited

- editing translator algorithm;
- changing settings schema;
- changing Popup UI.

### Acceptance

Tests demonstrate normalized outputs for existing upstream states.

---

## P1-T03 — Page KCL: commands

**Level:** L3

### Goal

Expose intent-level commands:

```js
translatePage()
stopPageTranslation()
setPageDisplayMode(mode)
setPageProvider(apiSlug)
setPageTargetLanguage(lang)
setCurrentSitePreference(preference)
```

Only expose commands verified to have stable existing upstream behavior.

### Acceptance

Contract tests prove actual underlying KISS state/action changes.

---

## P1-T04 — Provider KCL

**Level:** L3

### Goal

Expose provider list and role-safe selection without duplicating provider definitions.

### Suggested outputs

```js
listTranslationProviders()
getProviderDescriptor(apiSlug)
isProviderUsable(apiSlug)
```

Descriptor should include only product-safe fields needed by UI, such as:

- stable id/slug;
- display name;
- capability hints if reliable.

Do not expose secrets.

### Acceptance

- credentials are not copied;
- provider list stays sourced from KISS;
- deleted/invalid provider references are handled.

---

## P1-T05 — Selection KCL read/command boundary

**Level:** L3

### Goal

Wrap the minimum selection behaviors needed by Kisu.

### Must not

rebuild dictionary/translation request logic.

### Candidate contract

```js
getSelectionCapabilities()
getSelectionProvider()
setSelectionProvider(apiSlug)
translateSelection(text)
lookupSelection(text)
```

If upstream has multiple existing APIs for dictionary vs translation, normalize only what Kisu actually needs.

### Acceptance

Existing selection provider behavior remains intact.

---

## P1-T06 — Subtitle KCL read-only state and capabilities

**Level:** L3/L4

### Goal

Normalize subtitle state without claiming capabilities upstream does not actually have.

### Candidate state

- enabled;
- display mode;
- target language;
- provider;
- contextual capability available;
- segmentation capability available;
- current normalized status.

### Important

No product term such as “Contextual AI” may be returned unless its mapping is supported by real upstream semantics.

### Acceptance

Unit tests cover capability-present and capability-absent states.

---

## P1-T07 — Subtitle KCL commands

**Level:** L3/L4

### Goal

Expose:

```js
setSubtitleEnabled()
setSubtitleDisplayMode()
setSubtitleProvider()
setSubtitleTargetLanguage()
setSubtitleContextMode()
```

where supported.

### Prohibited

- modifying segmentation algorithms;
- modifying caption parsing;
- modifying translation queue algorithms.

### Escalate

Any missing upstream lifecycle hook should become a proposed carried patch reviewed by L4 before coding.

---

## P1-T08 — KCL semantic contract test suite

**Level:** L3

### Goal

Create explicit tests for the critical mappings.

Minimum contracts:

1. page provider selection;
2. page display mode;
3. site preference;
4. selection provider;
5. subtitle display mode;
6. subtitle provider;
7. contextual-mode mapping when supported.

### Acceptance

A future upstream schema change should break these tests rather than silently change product behavior.

---

# 7. P2 — UI behavior boundary and neutral renderer

This phase intentionally does **not** choose the final visual style.

## P2-T01 — Create semantic UI token contract

**Level:** L2

### Goal

Create token names and a neutral baseline, not a brand style.

### Files

```text
src/kisu/ui/tokens/
```

### Required categories

- semantic colors;
- space;
- type;
- radius;
- elevation;
- motion;
- z-index.

### Constraints

- feature code must consume semantic primitives rather than raw fixed values where practical;
- values are explicitly marked provisional;
- no reference to a named design style;
- no decorative gradients/glass effects.

### Acceptance

Changing token values does not affect product semantics.

---

## P2-T02 — Create minimal primitives required by page flow

**Level:** L2/L3

### Goal

Provide only primitives required by P3.

Likely:

- Button;
- IconButton;
- SegmentedControl;
- Select/Popover;
- Surface;
- InlineStatus;
- Tooltip.

### Constraints

- implementation may use MUI internally;
- public primitive props must not expose unnecessary MUI-specific styling APIs to feature code;
- accessibility labels/focus behavior required.

### Acceptance

A simple story/test harness can render each primitive in light/dark.

---

## P2-T03 — Define feature view-model convention

**Level:** L3

### Goal

Prevent UI rendering from directly interpreting KISS state.

Create a small documented pattern:

```text
KCL state
 ↓
feature hook/controller
 ↓
view model
 ↓
surface
```

Implement only for the page feature initially.

### Output

- page feature hook/controller;
- tests for state mapping;
- short convention doc.

### Acceptance

Page surface can be re-rendered in another style without changing KCL.

---

## P2-T04 — Neutral Popup shell

**Level:** L2

### Goal

Create a functionally readable Popup container used for interaction development.

### Important

This is **not** the final design.

Do not polish:

- brand-specific typography;
- distinctive radius system;
- shadows;
- decorative layout;
- signature motion.

### Acceptance

- light/dark readable;
- keyboard focus works;
- content fits typical extension popup constraints;
- placeholder states render.

---

## P2-T05 — UI change-resilience review

**Level:** L4 review

### Review question

“If the user rejects the entire visual style tomorrow, can we replace it without touching KCL or feature semantics?”

Block P3 if answer is no.

Review specifically for:

- raw MUI `sx` scattered through feature logic;
- fixed style values in controllers;
- domain state named after visual components;
- layout assumptions inside KCL;
- unnecessary generic theme engine.

---

# 8. P3 — Page translation product flow

## P3-T01 — Page feature controller/view model

**Level:** L3

### Goal

Map KCL page state into product-facing state.

Must cover:

- translation idle;
- active;
- stopping;
- unavailable/unsupported;
- no usable provider;
- provider error;
- site disabled;
- display mode;
- target language;
- selected provider.

### Output

`src/kisu/product/page/...`

### Acceptance

Pure/controller tests cover all states.

No final visual styling.

---

## P3-T02 — Primary translate control

**Level:** L2

### Goal

Implement the primary page action against the view model.

### Acceptance

- idle → translate;
- active → clear active/state behavior as defined by controller;
- disabled/error state explains why action is unavailable;
- keyboard activation works.

---

## P3-T03 — Page display-mode control

**Level:** L2

### Goal

Expose supported KCL modes only.

### Acceptance

Changing mode changes underlying KISS behavior through KCL and survives Popup reopen.

---

## P3-T04 — Page language control

**Level:** L2

### Goal

Expose source/target display with editable target language where current KISS behavior supports it.

### Acceptance

- long language names handled;
- invalid stored value falls back safely;
- no new language registry duplicated.

---

## P3-T05 — Page provider picker

**Level:** L2/L3

### Goal

Select a KISS provider for page translation.

### Requirements

- list comes from Provider KCL;
- no credential editing in Popup;
- invalid/deleted provider handled;
- “manage services” navigates to Settings/legacy provider management.

---

## P3-T06 — Site preference action

**Level:** L3

### Goal

Expose minimum site policy through existing KISS behavior.

Minimum:

- automatic/allow as applicable;
- never/disable;
- clear override.

Do not build a second site rules engine.

---

## P3-T07 — Page error/status presentation

**Level:** L2

### Goal

Render normalized error/status states from the controller.

No raw stack trace as primary UI.

---

## P3-T08 — Page Popup behavior test matrix

**Level:** L2/L3

Test:

- idle;
- active;
- all display modes;
- provider switch;
- invalid provider;
- site disabled;
- target language;
- keyboard;
- light/dark;
- long localization text.

---

## P3-T09 — Page flow browser smoke

**Level:** L3

Manual or automated where practical:

- static article;
- SPA;
- GitHub-like dynamic page;
- mixed language page;
- code blocks;
- current-site preference;
- streaming provider if configured.

### Gate

P3 is complete when page translation is functionally productized under the neutral renderer.

Visual polish is deferred to P7.

---

# 9. P4 — Selection / dictionary product flow

## P4-T01 — Inventory existing selection capabilities

**Level:** L3

### Goal

Produce an implementation map from actual upstream code.

Document:

- trigger modes;
- floating button;
- direct translation;
- dictionary;
- AI dictionary;
- pronunciation;
- favorite;
- copy;
- providers;
- drag/resize;
- click-away;
- viewport positioning.

### Output

`docs/architecture/selection-capability-map.md`

No code changes.

---

## P4-T02 — Selection content presentation classifier

**Level:** L3

### Goal

Choose product presentation state:

- lexical/word-like;
- phrase/sentence;
- multiline/long;
- unsupported/empty.

Use lightweight heuristics or existing upstream signals.

### Prohibited

- new NLP dependency;
- external classification API.

### Acceptance

Tests include punctuation, code-like token, URLs, CJK, multiline text.

---

## P4-T03 — Selection feature controller/view model

**Level:** L3

### Goal

Normalize:

- selected text;
- current presentation type;
- translation state;
- dictionary state;
- provider;
- available actions;
- errors.

No style decisions.

---

## P4-T04 — Selection anchor/geometry adapter

**Level:** L3

### Goal

Provide stable overlay anchoring/clamping using existing upstream behavior where possible.

### Must test

- top;
- bottom;
- left;
- right viewport edge;
- zoom;
- long result;
- resize;
- page scroll.

### Prohibited

Do not replace known upstream viewport workarounds without identifying their purpose.

---

## P4-T05 — Neutral lexical result surface

**Level:** L2

### Goal

Render:

- term;
- pronunciation if available;
- concise meaning;
- dictionary detail;
- secondary actions.

No final styling.

---

## P4-T06 — Neutral sentence result surface

**Level:** L2

### Goal

Render:

- translated result;
- source;
- copy/retry/provider;
- loading/streaming/error.

Keep geometry stable while streaming.

---

## P4-T07 — Selection action row

**Level:** L2

### Goal

Wire existing capabilities such as:

- copy;
- pronunciation;
- favorite;
- provider;
- expand/more.

Only show actions actually available.

---

## P4-T08 — Selection trigger integration

**Level:** L3

### Goal

Connect Kisu surface to existing selection trigger lifecycle without rewriting the trigger engine.

### Acceptance

Existing configured trigger modes are preserved unless a specific Kisu product default overrides only new installs.

---

## P4-T09 — Hostile-page regression suite

**Level:** L3

Test pages with:

- aggressive reset CSS;
- high z-index overlays;
- transformed containers;
- scrollable containers;
- code selection;
- long pages;
- zoom;
- dynamic DOM.

Verify isolation and viewport bounds.

---

## P4-T10 — Selection compatibility review

**Level:** L4 review

Review:

- whether Kisu accidentally took ownership of trigger/runtime logic;
- whether any upstream workaround was removed;
- whether direct upstream schema leaks into the surface;
- whether future visual redesign can be isolated.

---

# 10. P5 — YouTube subtitle product flow

## P5-T01 — Subtitle lifecycle map

**Level:** L4 planning / strong L3 execution

### Goal

Document actual lifecycle:

```text
YouTube SPA navigation
→ player/control mount
→ caption track discovery
→ caption provider
→ segmentation
→ translation queue/provider
→ subtitle manager
→ render/update
```

Mark protected TRACK files.

Output:

`docs/architecture/youtube-lifecycle.md`

---

## P5-T02 — Product subtitle vocabulary mapping

**Level:** L4

### Goal

Define truthful product concepts from real KISS capabilities.

For each candidate label define exact upstream mapping:

- Original;
- Bilingual;
- Translated;
- Fast;
- Contextual;
- contextual unavailable/fallback.

### Critical rule

Do not use “Contextual AI” if actual upstream semantics cannot guarantee the intended context behavior.

Output:

`docs/product/subtitle-modes.md`

---

## P5-T03 — Subtitle feature controller/view model

**Level:** L3

### Goal

Normalize:

- captions unavailable;
- subtitles disabled;
- loading;
- active;
- translating;
- provider failure;
- mode;
- language;
- provider;
- contextual capability.

---

## P5-T04 — Neutral YouTube control mount

**Level:** L3

### Goal

Mount a minimal Kisu-owned control in/near the player without final visual design.

### Acceptance

- one control only;
- survives SPA navigation;
- cleans up correctly;
- no stale video binding;
- no playback blocking.

---

## P5-T05 — Subtitle mode control

**Level:** L2/L3

### Goal

Wire display mode through KCL.

Only show supported modes.

---

## P5-T06 — Subtitle provider control

**Level:** L2

### Goal

Select subtitle provider independently from page/selection provider where underlying settings permit.

No credential duplication.

---

## P5-T07 — Subtitle target language control

**Level:** L2

Reuse upstream language definitions.

---

## P5-T08 — Context mode control

**Level:** L3

### Goal

Expose contextual mode only when `getSubtitleCapabilities()` says it is supported.

### States

- available;
- unavailable;
- available but provider incompatible;
- fallback state if upstream explicitly defines one.

No pretend mode.

---

## P5-T09 — Subtitle failure/status presentation

**Level:** L2

Distinguish:

- no captions;
- provider error;
- network/rate limit;
- queue/translation;
- context unavailable;
- generic internal failure.

---

## P5-T10 — YouTube SPA regression tests

**Level:** L3/L4

Test:

- open video;
- switch to another video via SPA;
- back/forward;
- enable after captions load;
- enable before captions load;
- switch provider mid-session if supported;
- disable/re-enable;
- no duplicate control;
- no old-video translated lines on new video.

---

## P5-T11 — Subtitle core divergence audit

**Level:** L4 review

Block completion if:

- Kisu copied segmentation logic;
- Kisu modified caption parsing without explicit carried patch;
- control state directly reads unstable upstream schema outside KCL;
- stale lifecycle risk remains.

---

# 11. P6 — Onboarding and Simple Settings

## P6-T01 — Settings projection map

**Level:** L3

### Goal

Map every Simple Settings field to:

- existing KISS setting;
- Kisu-owned additive setting;
- derived KCL state.

Output:

`docs/architecture/settings-projection.md`

No UI implementation until mapping is complete.

---

## P6-T02 — Settings navigation skeleton

**Level:** L2

Sections:

- General;
- Translation Services;
- Page;
- Selection;
- YouTube;
- Appearance;
- Sites;
- Advanced;
- About.

Visual style remains neutral.

---

## P6-T03 — General settings fields

**Level:** L2

Only implement settings already needed by V0.1.

No speculative controls.

---

## P6-T04 — Page settings section

**Level:** L2

Expose V0.1 product settings only.

Advanced internals remain in legacy settings.

---

## P6-T05 — Selection settings section

**Level:** L2/L3

Expose:

- trigger mode;
- selection provider;
- relevant behavior toggles supported by current KISS.

Avoid exposing every upstream knob.

---

## P6-T06 — YouTube settings section

**Level:** L2/L3

Expose:

- enabled/default behavior;
- provider;
- target language;
- display mode;
- contextual option if supported.

---

## P6-T07 — Translation service list

**Level:** L3

### Goal

Present configured providers cleanly.

Use upstream definitions.

No full rewrite of advanced custom API editor.

---

## P6-T08 — Common provider edit path

**Level:** L3

### Goal

For common provider fields, build a simplified edit route if existing upstream APIs make this low-risk.

For advanced custom hooks/body/request/response manipulation:

- route to legacy Advanced configuration.

If reusing upstream editor is cleaner, do that.

---

## P6-T09 — Advanced escape hatch

**Level:** L2

### Goal

Ensure all advanced legacy capabilities remain reachable.

Acceptance:

No existing KISS power-user configuration becomes impossible solely because Kisu Simple Settings exists.

---

## P6-T10 — First-run onboarding state machine

**Level:** L3

Steps:

1. target language;
2. translation service;
3. page/selection/YouTube defaults.

### Constraints

- no final visual style;
- no account signup;
- no unnecessary provider parameters;
- skip/revisit supported where safe.

---

## P6-T11 — First-run onboarding UI

**Level:** L2

Render the P6-T10 state machine with neutral primitives.

---

## P6-T12 — Existing-user migration tests

**Level:** L3

Test:

- fresh install;
- KISS existing settings;
- several custom providers;
- invalid/deleted provider reference;
- old dark mode;
- non-English UI;
- reopening legacy Advanced settings.

---

# 12. DG — Design Freedom Gate

This is an explicit decision gate, not a coding milestone.

The user has intentionally not chosen the final UI/UX style yet.

Before P7, produce 2–4 genuinely different visual/interaction directions using the **same functional product state**.

The design exploration may change:

- typography;
- density;
- layout hierarchy;
- control shape;
- border/radius;
- icon treatment;
- color system;
- elevation;
- motion;
- information grouping.

It must not require changes to:

- KCL;
- translation behavior;
- storage schema;
- subtitle processing;
- provider semantics.

## Required decision artifact

`docs/design/DESIGN-DIRECTION.md`

It should contain the selected direction and reject/avoid examples.

Until this file is approved, P7 final styling is blocked.

---

# 13. P7 — Visual system and final UI/UX

P7 is intentionally separated from P0–P6.

## P7-T01 — Implement approved design tokens

**Level:** L2/L3

Input:

`DESIGN-DIRECTION.md`

Change provisional token values into approved design values.

No feature semantics changes.

---

## P7-T02 — Implement approved primitive recipes

**Level:** L2/L3

Update primitive rendering to match the selected design.

Feature surfaces should require minimal or no changes.

---

## P7-T03 — Popup composition refinement

**Level:** L3

May change information composition/spacing based on approved design, but must preserve P3 behavior contracts.

---

## P7-T04 — Selection composition refinement

**Level:** L3

Preserve P4 behavior and geometry invariants.

---

## P7-T05 — YouTube control refinement

**Level:** L3

Preserve P5 lifecycle.

---

## P7-T06 — Settings/onboarding refinement

**Level:** L2/L3

Preserve P6 state machine/settings mapping.

---

## P7-T07 — Accessibility and localization polish

**Level:** L2/L3

Verify:

- focus;
- keyboard;
- contrast;
- long strings;
- Chinese/English;
- icon labels;
- reduced motion where relevant.

---

## P7-T08 — User visual acceptance loop

**Owner:** user + L4 design assistant

This can iterate several times.

Important:

A rejected visual direction should primarily require changes in P7-owned files, not P1–P6 architecture.

If changing the style repeatedly forces KCL/domain edits, stop and repair UI boundaries.

---

# 14. P8 — Upstream integration rehearsal

## P8-T01 — Weekly upstream intake review

**Level:** L3, escalates to L4 for semantic/core changes.

### Goal

Review:

- latest stable release since baseline;
- important `dev` changes;
- security/browser fixes;
- TRACK schema changes;
- FILTER capabilities.

Produce an intake report using the template.

Do not merge yet.

---

## P8-T02 — Select candidate stable baseline

**Level:** L4

### Decision criteria

- security;
- browser compatibility;
- critical-flow fixes;
- integration cost;
- dependency coherence;
- whether latest stable is meaningfully better than current baseline.

Do not automatically choose the newest tag.

---

## P8-T03 — Create upstream-sync branch and integrate

**Level:** L4/L3

Flow:

```bash
git fetch upstream
git checkout -b upstream-sync/<date> next
# integrate selected stable baseline according to repository history strategy
```

Resolve TRACK first, KCL second, Kisu OWN surfaces last.

Do not “solve” conflicts by deleting Kisu behavior.

---

## P8-T04 — Revalidate carried patches

**Level:** L3

For every active `KP-*`:

- still required?
- upstream now provides equivalent hook?
- conflict?
- test still valid?

Remove obsolete carried patches.

---

## P8-T05 — Run compatibility suite

**Level:** L3

Run:

- upstream tests;
- KCL contract tests;
- Kisu tests;
- Chrome build;
- Firefox build;
- critical browser smoke;
- YouTube SPA smoke.

---

## P8-T06 — Integration health report

**Level:** L4

Record:

- number of conflicts;
- conflict hotspots;
- TRACK-owned LOC touched;
- carried patch count;
- KCL changes;
- semantic changes;
- whether ownership boundaries need adjustment.

If repeated conflict hotspots appear, repair architecture before release.

---

# 15. P9 — Release hardening

## P9-T01 — Full critical-flow regression

**Level:** L3

Page:

- static article;
- SPA;
- dynamic GitHub-like page;
- mixed language;
- code;
- site preference.

Selection:

- word;
- sentence;
- multiline;
- code;
- viewport edges;
- streaming;
- copy/pronunciation/favorite if enabled.

YouTube:

- manual captions;
- auto captions;
- long video;
- SPA navigation;
- provider failure;
- context mode.

---

## P9-T02 — Security/privacy review

**Level:** L4

Check:

- API key handling;
- logs;
- external requests;
- CSP/Trusted Types;
- ShadowRoot/page isolation;
- permissions;
- telemetry;
- translated HTML handling.

---

## P9-T03 — License/attribution release review

**Level:** L3/L4

Check:

- GPL notices;
- KISS attribution;
- Kisu branding;
- source availability;
- modified-file documentation if required.

---

## P9-T04 — Release metadata

**Level:** L2

Update:

- Kisu version;
- KISS baseline;
- exceptional patches;
- known caveats;
- supported/certified browsers.

---

## P9-T05 — Independent release review

**Level:** L4/L5

Review against architecture.

Block release for:

- unexplained core divergence;
- silent settings incompatibility;
- broken KCL contracts;
- YouTube lifecycle errors;
- API key/privacy regressions;
- unmaintainable upstream patch set.

---

# 16. Direct copy-paste prompts

## Prompt A — L4 milestone planner

```text
You are the architecture/tactical lead for Kisu, an opinionated downstream product based on KISS Translator.

Read KISU-ARCHITECTURE-v2.md and KISU-ROADMAP-v2.md first.

Plan only the assigned roadmap task or task group. Do not broaden scope.

Architecture constraints:
- TRACK/FILTER/OWN ownership is authoritative.
- Stable KISS releases are the normal integration baseline; dev is a watch source.
- Kisu product behavior must go through the KISS Compatibility Layer (KCL) where an upstream semantic mapping exists.
- Do not create a selective-history fork from many cherry-picks.
- Do not duplicate translator/provider/subtitle algorithms.
- Do not duplicate provider credentials/settings.
- Do not migrate framework/build tooling in V0.1.
- UI behavior must remain independent of the final visual style.
- The final visual style is not selected; do not encode a named aesthetic, fixed design language, or style-specific domain state.
- Any change in TRACK-owned upstream files requires explicit carried-patch justification.

For the assigned task produce:
1. exact current upstream control/data path;
2. exact files to add/modify;
3. interfaces/settings/events to reuse;
4. whether each change is TRACK/FILTER/OWN and Product/KCL/Upstream-adjacent;
5. implementation steps sized so L3/L2 agents can execute independently;
6. tests and commands;
7. rollback path;
8. blockers that must be decided before coding.

Reject speculative refactors.
```

## Prompt B — L3 implementation

```text
Implement roadmap task <TASK-ID> for Kisu.

Read:
1. KISU-ARCHITECTURE-v2.md
2. KISU-ROADMAP-v2.md
3. the exact <TASK-ID> packet
4. referenced control-path/ADR documents

Do not solve adjacent tasks.

Before coding:
- summarize the existing control path;
- list files you will modify;
- state whether any file is TRACK-owned upstream code.

Rules:
- use KCL for product/upstream semantic boundaries;
- preserve existing settings and provider definitions;
- do not duplicate translation/subtitle algorithms;
- do not migrate tooling or add global state frameworks;
- do not freeze a final visual aesthetic;
- keep visual values out of product/domain logic;
- if a required change touches TRACK core and the task did not authorize it, stop that part and report a proposed carried patch instead.

Implement the task completely, add focused tests, and run relevant existing tests.

Final report:
- files changed;
- behavior implemented;
- tests/commands and results;
- baseline failures;
- compatibility implications;
- any upstream-owned code touched;
- unresolved risks;
- rollback method.
```

## Prompt C — L2 focused implementation

```text
Implement only Kisu roadmap task <TASK-ID>.

The interface and behavior are already defined by the roadmap and existing code. Do not redesign them.

Constraints:
- modify only the named/necessary files;
- no new architecture;
- no new dependencies unless explicitly required;
- no direct KISS settings access if a KCL interface exists;
- no translation/provider/subtitle algorithm changes;
- keep styling semantic and provisional unless P7 Design Freedom Gate has been approved;
- preserve accessibility and localization behavior;
- add/update focused tests.

If the required interface is missing or ambiguous, do not invent it. Report the exact blocker.

Return:
- concise change summary;
- tests run;
- remaining blocker/risk if any.
```

## Prompt D — Upstream intake reviewer

```text
Review KISS Translator upstream changes for Kisu.

Kisu is an opinionated downstream product. Product selectivity does not mean constructing a custom Git history from many cherry-picks.

Read:
- KISU-ARCHITECTURE-v2.md
- docs/upstream/ownership.md
- current docs/upstream/baseline.json

Review the specified KISS release and important dev changes.

For each meaningful change classify:
- ownership: TRACK / FILTER / OWN
- product decision: ADOPT / ADAPT / REFERENCE / IGNORE
- urgency: immediate / next integration / observe
- KCL impact
- test impact
- carried-patch impact

Prioritize:
1. security;
2. browser/runtime compatibility;
3. page/selection/YouTube regressions;
4. storage/schema/API semantic changes;
5. useful capabilities;
6. KISS product/UI changes.

Do not recommend an upstream merge solely because a newer version exists.

End with:
- recommended stable integration baseline;
- whether Kisu should integrate now;
- any exceptional hotfix worth taking before the next stable sync.
```

## Prompt E — UI boundary review before design selection

```text
Review the current Kisu UI implementation for design-change resilience.

The final visual/UX style has NOT been selected.

Do not critique whether the UI is visually beautiful. Evaluate whether a future major style change can be implemented without changing translation semantics, KCL, storage, or subtitle core.

Find:
- visual values leaking into product/domain logic;
- MUI-specific APIs leaking through feature contracts;
- layout concepts embedded in KCL;
- component names/state that encode a temporary visual design;
- excessive design-system abstraction;
- insufficient semantic primitives;
- brittle pixel/snapshot tests;
- surface logic that cannot be re-composed.

For every finding give severity, affected files, minimal correction, and test/review method.

Pass only if the renderer/theme/surface composition can change substantially while feature semantics remain stable.
```

## Prompt F — Final visual refinement after Design Freedom Gate

```text
The Kisu functional behavior is already implemented and DESIGN-DIRECTION.md is approved.

Refine the assigned Kisu surface to match the approved design direction.

Do not change:
- KCL;
- translation behavior;
- provider semantics;
- storage schema;
- subtitle algorithms;
- browser lifecycle.

You may change:
- design tokens;
- primitive recipes;
- typography;
- spacing;
- icons;
- surface composition;
- motion;
- visual hierarchy.

Preserve:
- loading/error/empty states;
- keyboard/focus behavior;
- localization;
- hostile-page geometry constraints;
- existing product acceptance tests.

Make one controlled visual pass and report any requested design change that would require domain/architecture changes instead of implementing that architectural change silently.
```

---

# 17. Recommended execution grouping

The roadmap is granular, but do not issue one task per trivial file.

Recommended agent sessions:

### Session A — L3
P0-T01 through P0-T04.

### Session B — L4/L3
P0-T05 + plan P1.

### Session C — L3
P1-T01 through P1-T04.

### Session D — L3/L4
P1-T05 through P1-T08.

### Session E — L2/L3
P2-T01 through P2-T04.

### Gate review — L4
P2-T05.

### Session F — L3 + L2 subtasks
P3-T01 through P3-T09.

### Session G — L3 + L2 subtasks
P4-T01 through P4-T09.

### Gate review — L4
P4-T10.

### Session H — L4 planning + L3 implementation
P5-T01 through P5-T11.

### Session I — L3/L2
P6-T01 through P6-T12.

### Human design gate
DG.

### Session J — L3/L2 + user review
P7.

### Session K — L4/L3
P8.

### Session L — L4/L3/L2
P9.

This grouping avoids excessive context switching while preserving bounded tasks.

---

# 18. Stop conditions and escalation rules

An L3/L2 agent must stop the affected part and escalate when:

- it needs to edit translator/subtitle/browser TRACK core unexpectedly;
- upstream schema semantics are unclear;
- a “simple” UI task requires a storage migration;
- provider credentials would need duplication;
- YouTube lifecycle behavior cannot be explained;
- a workaround appears obsolete but its original purpose is unknown;
- changing style requires KCL/domain changes;
- a new dependency is needed primarily for convenience rather than a verified requirement;
- the task requires choosing the product's visual identity before DG.

Escalation output should be narrow:

```text
Blocker:
Why current task cannot safely continue:
Exact files/interfaces involved:
Smallest decision needed:
Suggested options:
Evidence/tests:
```

---

# 19. V0.1 definition of done

V0.1 is not done merely when the UI looks better.

It is done when:

- full-page translation has a Kisu-owned product flow;
- selection/dictionary has a Kisu-owned product flow;
- YouTube subtitle translation has a Kisu-owned product flow;
- users can select their own providers for the relevant roles;
- KCL contract tests protect critical semantics;
- Kisu has a coherent KISS stable baseline;
- TRACK/FILTER/OWN ownership is documented;
- carried patches are explicit and small;
- Advanced KISS capabilities remain reachable where Kisu has not productized them;
- final UI direction is implemented only after the Design Freedom Gate;
- replacing the visual style would not require KCL/core rewrites;
- Chrome/Edge/Firefox critical-flow validation passes;
- a real upstream integration rehearsal has succeeded;
- an independent L4/L5 review finds no unresolved architectural blocker.

The core maintenance success condition remains:

> **Kisu can become increasingly opinionated without losing the ability to absorb valuable KISS engineering work.**
