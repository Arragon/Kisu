# Kisu — Technical Architecture Design v2

> Project: **Kisu**  
> Type: opinionated downstream product based on KISS Translator  
> Status: V0.1 architecture baseline, revision 2  
> Date: 2026-08-31  
> Companion: `KISU-ROADMAP-v2.md`  
> Upstream: `fishjar/kiss-translator`  
> License baseline: GPL-3.0

---

## 0. Executive decision

Kisu is not a cosmetic skin for KISS Translator and should not be engineered as a one-time fork.

Kisu is an **opinionated downstream product**:

- KISS is a major technical upstream and source of proven translation/browser/subtitle infrastructure.
- Kisu owns its product philosophy, feature exposure, defaults, interaction model, information architecture, and eventually selected capabilities.
- Kisu should selectively expose and adapt upstream capabilities without trying to construct its own KISS history from dozens of cherry-picked commits.
- Kisu should keep upstream divergence concentrated in product-owned code and a small compatibility boundary.
- Kisu should normally integrate from stable KISS releases/tags, while continuously observing `dev` for security, browser breakage, regressions, and capabilities worth evaluating.

The primary architecture rule is:

> **Product divergence is healthy; foundation divergence is expensive.**

The primary upstream rule is:

> **Observe continuously, integrate on Kisu's schedule, and prefer stable upstream baselines.**

The primary UI rule is:

> **Behavior and product semantics must not depend on a particular visual style.**

V0.1 continues to focus on the three user-critical flows:

1. full-page immersive bilingual translation;
2. selection translation / dictionary lookup;
3. YouTube bilingual and context-aware subtitle translation.

However, the architecture intentionally allows Kisu to grow beyond UX replacement later.

---

# 1. Verified upstream snapshot

The architecture was checked against KISS Translator on 2026-08-31.

Verified facts:

- latest stable GitHub release observed: `v2.0.32`, published 2026-08-12;
- stable `v2.0.32` release target: `7dfc03ebc7f10530681109f6a5aec982a5573936`;
- latest inspected `dev` commit during this design pass: `c95bd46bead3a0e5947428f2b3b4ebb193be9207`, dated 2026-08-29;
- the `dev` branch remains actively developed after the latest stable release;
- package stack remains React 18, MUI 5, Emotion, `react-scripts` / `react-app-rewired`, pnpm;
- upstream currently builds multiple targets including Chrome, Edge, Firefox, Safari, Thunderbird, web, and userscript variants;
- source already separates `apis`, `libs`, `injectors`, `subtitle`, `views/Popup`, `views/Selection`, and `views/Options`;
- the subtitle subsystem is modular and actively tested;
- upstream Options contains large product-facing files, including a very large API settings implementation;
- recent upstream development includes UI/runtime/selection/browser behavior fixes, confirming that Kisu must expect moving internals.

Engineering implication:

**Kisu should not use upstream `dev` HEAD as its normal release baseline.**  
`dev` is a watch source. Stable tags/releases are the normal integration source. Exceptional fixes may be taken earlier when justified.

---

# 2. Product definition

## 2.1 Root goal

Build the browser translation tool we actually want to use long term, while continuing to benefit from KISS's mature open infrastructure.

Kisu should prioritize:

- user-controlled translation providers;
- high-quality bilingual reading;
- low-friction full-page translation;
- excellent selection/dictionary interaction;
- high-quality YouTube subtitle translation with context when available;
- sane defaults;
- progressive disclosure;
- predictable status and failure feedback;
- strong browser compatibility;
- long-term maintainability.

## 2.2 What Kisu is allowed to diverge on

Kisu may intentionally differ from KISS in:

- product scope;
- which upstream capabilities are exposed;
- defaults;
- configuration hierarchy;
- onboarding;
- provider role assignment;
- feature naming;
- interaction patterns;
- Popup behavior;
- selection experience;
- YouTube controls;
- appearance;
- feature composition;
- Kisu-owned capabilities introduced later.

## 2.3 What Kisu should resist diverging on

Kisu should avoid unnecessary divergence in:

- translation request infrastructure;
- provider transport/runtime;
- browser lifecycle and compatibility;
- DOM translation engine;
- storage foundation;
- site rule engine;
- caption acquisition;
- subtitle processing;
- segmentation algorithms;
- generic security fixes.

A divergence may still be justified if Kisu has a confirmed requirement that cannot be satisfied by adaptation.

---

# 3. Upstream ownership model: TRACK / FILTER / OWN

Kisu does not classify individual commits as its primary architecture mechanism. It classifies **subsystems and capabilities**.

## 3.1 TRACK

TRACK means:

> KISS is the implementation authority by default. Kisu normally integrates upstream evolution of this area and keeps local changes minimal.

Expected TRACK areas in V0.1:

- browser/runtime integration;
- request infrastructure;
- base storage mechanisms;
- translation engine;
- provider framework;
- DOM translation engine;
- caption acquisition;
- subtitle timing/processing foundation;
- site rule engine;
- security patches;
- browser compatibility fixes.

Typical upstream change handling:

- stable release sync: merge/integrate normally;
- product does not have to expose every new capability;
- generic bug fixes should usually be kept;
- local core patches require written justification.

## 3.2 FILTER

FILTER means:

> Kisu accepts the upstream implementation foundation but decides whether, where, and how the capability appears in the product.

Expected FILTER areas:

- new providers/models;
- advanced subtitle capabilities;
- contextual AI options;
- dictionary features;
- selection trigger capabilities;
- hover/hold/copy translation capabilities;
- site automation;
- provider-specific controls;
- advanced translation modes.

Example:

KISS adds a new “hold mouse button to translate” capability.

Kisu may:

- integrate the supporting upstream code as part of a stable baseline;
- leave the feature hidden;
- expose it later under a different interaction;
- expose it only as an advanced option;
- permanently ignore it at product level.

The code's existence does not imply product endorsement.

## 3.3 OWN

OWN means:

> Kisu is the implementation and product authority for this subsystem. Upstream changes are reference material rather than merge targets.

Expected Kisu-owned areas from V0.1:

- Kisu brand/product shell;
- Kisu Popup presentation;
- Kisu selection presentation;
- Kisu YouTube control presentation;
- onboarding;
- Simple Settings;
- product information architecture;
- feature exposure;
- Kisu defaults;
- Kisu visual system;
- Kisu-specific product preferences.

A FILTER subsystem must not be promoted to OWN casually.

## 3.4 FILTER → OWN promotion gate

Promotion is allowed only when most of the following are true:

1. Kisu has a stable independent implementation.
2. Upstream behavior repeatedly conflicts with Kisu product requirements.
3. Integration conflicts in that subsystem are recurring and expensive.
4. KCL can no longer isolate the differences cleanly.
5. Kisu has adequate regression coverage for the subsystem.
6. Taking ownership is expected to reduce, not increase, long-term maintenance.
7. The team explicitly accepts responsibility for future browser/security/compatibility maintenance in that area.

The decision must be recorded as an ADR.

## 3.5 Ownership registry

Create:

`docs/upstream/ownership.md`

It should contain a table like:

```text
Area                              Mode     Kisu owner        Notes
browser/runtime                   TRACK    upstream/KCL      no product divergence
translator core                   TRACK    upstream/KCL
provider framework                TRACK    upstream/KCL
new provider exposure             FILTER   product
subtitle processing foundation    TRACK    upstream/KCL
context subtitle capability       FILTER   product
Popup product surface             OWN      Kisu
Selection presentation            OWN      Kisu
YouTube control presentation      OWN      Kisu
Simple Settings                   OWN      Kisu
```

Update this registry only when responsibility meaningfully changes.

---

# 4. Upstream synchronization architecture

## 4.1 Two upstream streams

Kisu distinguishes:

### Watch stream

Source:

`upstream/dev`

Purpose:

- detect security fixes;
- detect browser/runtime regressions;
- detect changes to APIs/storage/subtitle behavior;
- discover capabilities worth evaluating;
- detect upcoming breaking changes early.

The watch stream does **not** automatically modify Kisu.

### Integration stream

Preferred source:

stable KISS release/tag.

Purpose:

- establish a coherent upstream baseline;
- avoid assembling an inconsistent custom KISS history;
- make Kisu releases reproducible;
- preserve a clear answer to “which KISS is this based on?”

## 4.2 Normal cadence

Recommended default:

- continuous automated/manual observation of releases and important `dev` changes;
- one upstream intake review per week;
- one integration assessment at each Kisu milestone boundary;
- normal code integration from an appropriate stable KISS release;
- no requirement to sync merely because a KISS release exists.

Kisu's product schedule controls integration.

## 4.3 Exceptional early intake

An upstream `dev` commit may be taken before stable release for:

- security issues;
- serious browser breakage;
- data corruption;
- provider-wide outage caused by upstream behavior;
- a confirmed critical bug in one of Kisu's three primary flows;
- a capability that blocks an active Kisu milestone and has sufficiently isolated dependencies.

Use exceptional intake sparingly.

## 4.4 Avoid selective-history fork

Do not use many cherry-picks as the normal mechanism.

Bad long-term pattern:

```text
take A
skip B
take C
partially reimplement D
take E
skip F
```

This creates hidden dependency problems and makes upstream ancestry difficult to reason about.

Preferred pattern:

```text
choose coherent stable baseline
        ↓
integrate TRACK foundation
        ↓
KCL adapts semantics/schema
        ↓
Kisu FILTER decides exposure
        ↓
Kisu OWN product remains independent
```

## 4.5 Upstream intake decision vocabulary

For capability/product review use:

- **ADOPT** — Kisu should expose/use substantially as-is.
- **ADAPT** — useful capability, but Kisu should reshape semantics/UX.
- **REFERENCE** — implementation or idea is informative; do not integrate as product behavior.
- **IGNORE** — no meaningful Kisu value.

These describe product treatment, not necessarily Git commit selection.

## 4.6 Upstream intake record

For each meaningful release or weekly review, create:

`docs/upstream/intake/YYYY-MM-DD-<release-or-window>.md`

Template:

```text
Upstream baseline/review:
Date:
Reviewed release/tag:
Reviewed dev range:

Security/browser changes:
Core behavior changes:
Schema/API changes:
Capabilities:
Product/UI changes:

Kisu decisions:
- item:
  ownership: TRACK/FILTER/OWN
  decision: ADOPT/ADAPT/REFERENCE/IGNORE
  reason:
  KCL impact:
  test impact:
  release urgency:

Integration recommendation:
```

## 4.7 Release baseline manifest

Every Kisu release must record:

```json
{
  "kisuVersion": "0.x.y",
  "kissBaseline": {
    "release": "v2.0.32",
    "commit": "..."
  },
  "exceptionalUpstreamPatches": [
    {
      "id": "KP-001",
      "upstreamCommit": "...",
      "reason": "..."
    }
  ]
}
```

Suggested repository location:

`docs/upstream/baseline.json`

---

# 5. Carried patch queue

Some modifications to TRACK-owned upstream files may be unavoidable.

Each such patch is a **carried patch** and must have an ID.

Examples:

- `KP-001 expose page translation state`
- `KP-002 expose subtitle runtime status`
- `KP-003 provide stable player-control mount hook`

Registry:

`docs/upstream/carried-patches.md`

Each entry:

```text
ID:
Status: active / upstreamed / obsolete
Why required:
Upstream-owned files touched:
Kisu consumer:
Could be upstreamed generically:
Removal condition:
Tests:
Last revalidated against:
```

Rules:

- product/UI PRs must not hide upstream-core modifications;
- carried patches should be narrow and independently revertible;
- if a generic patch is valuable to KISS, prefer upstream contribution;
- if carried patch count or depth rises repeatedly, trigger architecture review.

The health metric is not total Kisu LOC.

The health metric is:

> **How much TRACK-owned upstream code does Kisu carry, and how deep are those changes?**

---

# 6. Target system architecture

```text
┌───────────────────────────────────────────────────────────┐
│ Kisu Product                                               │
│                                                           │
│ Product IA / defaults / feature exposure / onboarding      │
│ Page / Selection / YouTube feature controllers             │
│ Kisu-owned capabilities                                    │
└─────────────────────────┬─────────────────────────────────┘
                          │ product semantic contracts
┌─────────────────────────▼─────────────────────────────────┐
│ Kisu UI Boundary                                           │
│                                                           │
│ headless/view-model hooks                                  │
│ surface composition                                        │
│ semantic UI primitives                                     │
│ design tokens / renderer                                   │
└─────────────────────────┬─────────────────────────────────┘
                          │ intent-level commands/state
┌─────────────────────────▼─────────────────────────────────┐
│ KCL — KISS Compatibility Layer                             │
│                                                           │
│ command adapter                                            │
│ state/schema projection                                    │
│ semantic translation                                       │
│ capability detection                                       │
│ event/status normalization                                 │
└─────────────────────────┬─────────────────────────────────┘
                          │ narrow compatibility seam
┌─────────────────────────▼─────────────────────────────────┐
│ KISS Upstream Foundation                                   │
│                                                           │
│ browser runtime / storage / translators / providers        │
│ DOM translation / site rules / captions / subtitle core    │
└───────────────────────────────────────────────────────────┘
```

Kisu-owned capabilities may later sit beside KCL when they do not depend on a corresponding KISS subsystem.

---

# 7. KCL — KISS Compatibility Layer

## 7.1 Purpose

KCL is not a second translation engine.

It is a **semantic firewall** between Kisu product concepts and changing KISS internals.

KCL responsibilities:

1. command adaptation;
2. state/schema projection;
3. semantic normalization;
4. capability detection;
5. event/status normalization;
6. narrowly scoped migrations around upstream schema changes.

## 7.2 Example problem KCL solves

Bad product code:

```js
if (settings.subtitleSetting.aiSegmentation === 3) {
  ...
}
```

This directly binds Kisu UI to one upstream schema.

Preferred product code:

```js
subtitleCapabilities.supportsContextualMode()
subtitleState.getMode()
subtitleCommands.setMode("contextual")
```

If KISS later changes its internal field structure, only KCL should change.

## 7.3 KCL contract principles

- expose product intent, not upstream implementation detail;
- remain thin;
- avoid copying algorithms;
- avoid creating a generic framework for hypothetical future upstreams;
- use existing KISS hooks/events/settings whenever possible;
- add a new KCL abstraction only when at least one real Kisu surface needs it;
- keep commands explicit and feature-scoped;
- return normalized statuses suitable for product logic;
- include capability checks where upstream versions can differ.

## 7.4 Initial KCL modules

Create only as needed:

```text
src/kisu/kcl/
├─ page.js
├─ selection.js
├─ subtitles.js
├─ providers.js
├─ sites.js
├─ settings.js
├─ capabilities.js
└─ version.js
```

Do not create all modules on day one if unused.

## 7.5 Example conceptual contracts

### Page

```js
getPageState()
translatePage()
stopPageTranslation()
setPageDisplayMode(mode)
getPageDisplayModes()
getPageProvider()
setPageProvider(apiSlug)
getSitePreference()
setSitePreference(preference)
```

### Selection

```js
getSelectionPreferences()
getSelectionProvider()
setSelectionProvider(apiSlug)
translateSelection(text)
lookupSelection(text)
getSelectionCapabilities()
```

### Subtitle

```js
getSubtitleState()
getSubtitleCapabilities()
setSubtitleEnabled(enabled)
setSubtitleDisplayMode(mode)
setSubtitleProvider(apiSlug)
setTargetLanguage(lang)
setContextMode(mode)
```

Exact signatures are implementation decisions after control-path tracing.

## 7.6 KCL compatibility contract tests

KCL must have tests that prove semantics, not only function execution.

Examples:

```text
Kisu set page provider X
→ actual KISS page request uses X

Kisu bilingual display mode
→ actual KISS state represents bilingual display

Kisu disable current site
→ KISS rule/settings behavior prevents auto translation as intended

Kisu selection provider X
→ selection translation uses X

Kisu contextual subtitle mode
→ actual upstream settings/capabilities corresponding to contextual mode are engaged
```

These tests are mandatory before Kisu claims compatibility with a new upstream baseline.

---

# 8. Repository organization

Recommended additive structure:

```text
src/
├─ kisu/
│  ├─ kcl/
│  ├─ product/
│  │  ├─ page/
│  │  ├─ selection/
│  │  ├─ subtitles/
│  │  ├─ onboarding/
│  │  └─ settings/
│  ├─ ui/
│  │  ├─ contracts/
│  │  ├─ primitives/
│  │  ├─ tokens/
│  │  ├─ theme/
│  │  └─ surfaces/
│  └─ migrations/
│
├─ apis/          # upstream TRACK
├─ libs/          # upstream TRACK
├─ injectors/     # upstream TRACK
├─ subtitle/      # mostly TRACK/FILTER
└─ views/         # legacy upstream product surfaces / migration targets

docs/
├─ upstream/
│  ├─ ownership.md
│  ├─ intake/
│  ├─ carried-patches.md
│  └─ baseline.json
├─ adr/
└─ architecture/
```

V0.1 should prefer **additive Kisu files** plus narrow entry/mount changes.

---

# 9. Feature architecture

## 9.1 Page translation

Product responsibilities:

- determine user-facing page translation state;
- expose translate/stop;
- expose target language;
- expose display mode;
- expose selected page provider;
- expose current-site preference;
- provide coherent status/error feedback.

KCL responsibilities:

- map these concepts to current KISS settings/events/runtime;
- normalize provider/status behavior.

Upstream responsibilities:

- page scanning;
- DOM translation;
- batching;
- translation requests;
- site rules;
- lifecycle.

## 9.2 Selection and dictionary

Product responsibilities:

- trigger UX;
- result information hierarchy;
- word-vs-sentence presentation policy;
- visible actions;
- provider choice;
- overlay geometry policy;
- progressive disclosure.

KCL responsibilities:

- translate/lookup intent;
- selection provider mapping;
- available actions/capabilities.

Upstream responsibilities:

- actual translation/dictionary requests;
- underlying trigger/lifecycle capabilities unless Kisu later takes ownership;
- browser/page integration.

## 9.3 YouTube subtitles

Product responsibilities:

- first-class subtitle control;
- understandable mode naming;
- provider selection;
- target language;
- visible progress/failure state;
- contextual translation product policy.

KCL responsibilities:

- map modes to real upstream capabilities;
- detect whether contextual mode is actually available;
- normalize status;
- protect Kisu from schema changes.

Upstream responsibilities:

- caption discovery;
- caption acquisition;
- subtitle timing;
- segmentation;
- AI segmentation;
- translation queue;
- subtitle processing;
- player lifecycle foundation where practical.

V0.1 must not copy subtitle algorithms into Kisu code.

---

# 10. Settings architecture

## 10.1 Single source of truth

Do not duplicate upstream settings merely because Kisu has a new UI.

Prefer:

`Kisu UI → KCL projection → KISS settings`

Only introduce Kisu-owned persisted settings for concepts that genuinely do not exist upstream.

## 10.2 Provider roles

Kisu needs independent product roles:

- page provider;
- selection provider;
- subtitle provider.

If KISS already stores separate provider fields, project them directly.

If a missing role mapping is required, persist only the role reference (for example `apiSlug`), never duplicate credentials or full provider definitions.

## 10.3 Migration rules

Every new persisted Kisu setting must have:

- default;
- schema/version owner;
- additive migration;
- idempotence;
- backward behavior;
- test;
- rollback behavior.

Avoid destructive migrations in V0.1.

---

# 11. UI/UX architecture designed for future style changes

This section is intentionally stricter than the previous architecture revision.

The user has **not selected a final UI/UX style**. The project must not turn a temporary visual direction into structural debt.

## 11.1 Separation of four concerns

Kisu UI must separate:

### A. Product semantics

Examples:

- translation active;
- page provider;
- subtitle mode;
- current site disabled;
- dictionary result;
- provider error.

No visual choices belong here.

### B. Interaction/view model

Examples:

- which action is primary;
- what can be expanded;
- selection overlay open/closed;
- provider picker state;
- loading/error/empty states.

This layer may change with UX decisions but should remain independent of colors, radii, typography, shadows, or Material components.

### C. Surface composition

Examples:

- Popup hierarchy;
- selection result layout;
- YouTube menu composition;
- settings navigation.

This may be redesigned later without changing KCL/domain behavior.

### D. Visual renderer

Examples:

- semantic tokens;
- component recipes;
- icons;
- typography;
- spacing;
- motion;
- light/dark expression.

This is the most replaceable layer.

## 11.2 UI dependency direction

```text
KCL / domain state
       ↓
feature controller / view model
       ↓
surface composition
       ↓
semantic primitives
       ↓
theme/tokens + current renderer
```

Never allow:

```text
theme component
    ↓
translation settings
```

or:

```text
MUI-specific state
    ↓
feature semantics
```

## 11.3 Semantic primitives, not style ownership

Examples of acceptable primitive APIs:

```jsx
<Button intent="primary" />
<IconButton label="Settings" />
<SegmentedControl value={mode} options={...} />
<Surface role="popover" />
<InlineStatus status="error" />
<ProviderPicker ... />
```

Avoid product code using:

```jsx
<Button sx={{ borderRadius: 14, boxShadow: ... }} />
```

throughout the feature layer.

Current primitives may internally use MUI.

The product surface should not care.

## 11.4 Semantic tokens

Define semantic token names:

```text
color.bg.canvas
color.bg.surface
color.bg.elevated
color.text.primary
color.text.secondary
color.border.default
color.action.primary
color.status.success
color.status.warning
color.status.danger

space.*
type.*
radius.*
elevation.*
motion.*
```

**Do not define the final values in the architecture.**

The architecture specifies the naming/ownership contract only.

A future style may choose:

- nearly square vs rounded;
- flat vs elevated;
- compact vs airy;
- monochrome vs colored accent;
- different font stack;
- different motion behavior.

None should require KCL/domain changes.

## 11.5 No style-specific architecture language

Architecture and feature code must not assume:

- “Linear style”;
- “Arc style”;
- “Raycast style”;
- “Material style”;
- glassmorphism;
- card-heavy layout;
- specific accent color;
- specific corner radius;
- specific shadow system;
- specific animation personality.

Reference products may be used during later design exploration, but are not architectural dependencies.

## 11.6 Neutral development renderer

Before a final style is approved, development may use a **neutral functional renderer**.

It should be:

- readable;
- accessible;
- light/dark capable;
- minimally styled;
- stable for interaction testing.

It should not be polished into a permanent visual identity.

The neutral renderer exists to unblock functional development.

## 11.7 Design Freedom Gate

Before final visual implementation of a surface, a design decision package should exist containing:

- chosen direction;
- reference screenshots/mood;
- density preference;
- typography direction;
- color direction;
- radius/elevation philosophy;
- motion philosophy;
- examples of desired/undesired patterns.

Until this gate is passed:

- interaction logic may be implemented;
- surface structure may be prototyped;
- semantic primitives may be built;
- final token values and decorative recipes should not be frozen.

## 11.8 Change budget

A future visual redesign should primarily touch:

```text
src/kisu/ui/tokens/
src/kisu/ui/theme/
src/kisu/ui/primitives/
src/kisu/ui/surfaces/
```

It should **not normally require changes** to:

```text
src/kisu/kcl/
translation core
provider core
subtitle processing
storage foundation
feature state semantics
```

If a visual style change requires widespread domain changes, the boundary has failed.

## 11.9 Avoid premature theme framework

Do not build:

- a marketplace theme engine;
- arbitrary runtime theme plugins;
- user-authored component recipes;
- a huge design-system package.

We only need replaceability, not speculative theming infrastructure.

---

# 12. Legacy UI and migration strategy

KISS product surfaces are allowed to coexist temporarily.

V0.1 migration pattern:

```text
legacy KISS surface
       ↓
new Kisu surface becomes functional
       ↓
Kisu surface becomes default
       ↓
legacy surface remains as development/advanced fallback when useful
       ↓
remove only after behavior parity and ownership decision
```

For Options specifically:

- create Kisu Simple Settings for primary flows;
- retain legacy Advanced settings;
- do not rewrite the whole existing API settings implementation early.

---

# 13. Technical stack policy

V0.1 default:

- keep React 18;
- keep current KISS build system;
- keep pnpm;
- keep existing browser extension targets;
- keep MUI/Emotion available.

Do not initiate:

- WXT migration;
- Plasmo migration;
- Vite migration;
- full TypeScript migration;
- full MUI removal;
- global state library migration.

These can be evaluated later if a measured maintenance problem justifies them.

The goal is to change product quality without simultaneously changing the platform.

---

# 14. Browser and runtime boundary

Content-script UI runs inside hostile pages.

Requirements:

- preserve upstream isolation mechanisms such as ShadowRoot where used;
- prevent page CSS from styling Kisu controls;
- prevent Kisu CSS from leaking into pages;
- clamp overlays to viewport;
- survive high-z-index pages;
- respect SPA lifecycle;
- preserve CSP/Trusted Types compatibility;
- avoid rendering translation output as executable page script;
- sanitize rich output where required.

YouTube specifically requires lifecycle protection against:

- duplicate control mount;
- stale video state;
- stale translation queue results;
- back/forward navigation;
- captions appearing after initial mount.

---

# 15. Security and privacy

Kisu must not weaken upstream security.

V0.1 must not:

- proxy API keys through a new Kisu server;
- add unnecessary telemetry;
- log API keys;
- persist raw secrets outside the existing secure path;
- send selected/page/video text to an additional service without explicit provider semantics;
- add remote code execution mechanisms for UI theming.

Provider UI is a view over existing provider/storage behavior.

---

# 16. License and branding

KISS is GPL-3.0.

Kisu should remain GPL-3.0 for the planned distributed fork.

Requirements:

- retain required upstream notices;
- make corresponding source available for distributed modified versions;
- state clearly that Kisu is based on KISS Translator;
- use Kisu branding to avoid implying official KISS status;
- document local modifications.

Suggested description:

> Kisu is an opinionated bilingual-reading and translation browser extension built on KISS Translator.

This section is engineering guidance, not legal advice.

---

# 17. Testing architecture

## 17.1 Baseline tests

Before Kisu behavior changes:

- record untouched stable upstream test state;
- record `dev` watch state separately when useful;
- do not treat pre-existing upstream failures as Kisu regressions.

## 17.2 KCL contract tests

Mandatory.

See section 7.6.

These are the primary defense against silent upstream semantic drift.

## 17.3 Product behavior tests

Test state and interaction semantics rather than pixel appearance.

Examples:

- primary page action changes correct domain state;
- provider picker changes provider role;
- selection word/sentence state chooses correct information hierarchy;
- subtitle control maps mode correctly;
- errors are classified.

## 17.4 Visual tests before style selection

Before a final UI direction exists:

- avoid brittle screenshot pixel baselines;
- test layout invariants only when functionally necessary;
- test viewport bounds;
- test overflow;
- test focus;
- test light/dark legibility.

After a style is approved, selected visual regression tests may be added.

## 17.5 Upstream sync test sequence

For each integration baseline:

1. upstream tests;
2. KCL contract tests;
3. Kisu unit/component tests;
4. primary-flow browser smoke tests;
5. YouTube SPA smoke;
6. settings migration tests.

## 17.6 Browser certification

V0.1 primary:

- Chrome/Chromium;
- Edge;
- Firefox.

Other upstream targets should continue to build when practical, but full product certification may be explicitly deferred.

---

# 18. Performance policy

Record baseline before redesign.

Track relative regressions in:

- Popup open/render;
- selection overlay open;
- page translation start;
- first translated segment;
- YouTube subtitle activation;
- long-page memory behavior;
- SPA navigation behavior.

Do not invent arbitrary performance targets without measurement.

A regression must be explained by a user-visible benefit or fixed.

---

# 19. Failure model

Normalize user-facing failure categories:

- no provider configured;
- invalid credentials;
- unauthorized;
- rate limited;
- timeout/network;
- unsupported page;
- no caption track;
- subtitle processing failure;
- contextual capability unavailable;
- site disabled;
- user stopped translation.

KCL may translate raw upstream errors into stable product categories.

Raw stack traces belong in diagnostics, not the primary interface.

---

# 20. Diagnostics

Kisu should have a lightweight diagnostics concept, not a telemetry platform.

Recommended development diagnostics:

- current Kisu version;
- KISS baseline;
- active carried patches;
- browser/runtime;
- active provider role mapping;
- last normalized error category;
- optional debug logs using existing upstream logging patterns.

No new remote analytics are required for V0.1.

---

# 21. Versioning and releases

Kisu versions are independent from KISS.

Example:

```text
Kisu 0.1.0
Based on KISS v2.0.32
```

Future:

```text
Kisu 0.3.1
Based on KISS v2.1.4
```

Kisu does not release merely because KISS releases.

Each Kisu release must identify:

- Kisu version;
- KISS stable baseline;
- exceptional upstream patches;
- ownership changes;
- known compatibility notes.

---

# 22. Git strategy

Recommended simple topology:

```text
upstream remote
  stable tags
  dev              # watch

origin
  main              # Kisu release-quality
  next              # integration
  feature/*         # short-lived
  upstream-sync/*   # temporary integration branch
```

Enable `git rerere` for repeated conflict resolutions.

Do not maintain a complex GitFlow.

Do not use a submodule/npm package overlay for KISS in V0.1; KISS is a complete extension rather than a stable library API.

---

# 23. Architecture health indicators

Healthy:

- most Kisu LOC is under `src/kisu`;
- KCL remains small;
- stable release sync conflicts are localized;
- KCL contract tests catch upstream semantic changes;
- Kisu product can change visually without touching KCL;
- Kisu can hide upstream features without deleting foundation code;
- carried patches are few and documented.

Warning:

- product components directly import many KISS storage internals;
- the same core files conflict every sync;
- many cherry-picks are required to construct the baseline;
- provider credentials are duplicated;
- UI style values leak into product/domain code;
- MUI-specific details appear inside KCL;
- subtitle algorithms are copied into Kisu;
- visual redesign requires core changes.

Critical:

- Kisu can no longer identify a coherent KISS baseline;
- translator/runtime core is substantially forked without explicit ownership transition;
- upgrades require weeks of manual conflict archaeology;
- KCL has become a second engine.

---

# 24. Architecture Decision Records

## ADR-001 — Kisu is an opinionated downstream product

Accepted.

Kisu owns product direction and does not seek functional parity with KISS.

## ADR-002 — TRACK / FILTER / OWN ownership model

Accepted.

Subsystem ownership, not per-commit cherry-picking, is the primary upstream strategy.

## ADR-003 — Stable KISS release is normal integration baseline

Accepted.

`dev` is continuously observed but not normally used as Kisu release HEAD.

## ADR-004 — KCL semantic firewall

Accepted.

Kisu product code should depend on intent-level KCL contracts rather than scattered upstream schema details.

## ADR-005 — Carried patch registry

Accepted.

Any local change in TRACK-owned code must be explicit and reviewable.

## ADR-006 — Product/UI may diverge heavily

Accepted.

Reducing UI/product diff is not a goal.

## ADR-007 — Visual style intentionally deferred

Accepted.

Architecture defines UI boundaries and semantic tokens but does not select a design aesthetic.

## ADR-008 — Keep current technical stack for V0.1

Accepted.

No build/framework migration without a confirmed blocker.

## ADR-009 — Legacy Advanced settings remain during V0.1

Accepted.

Avoid rewriting a large high-conflict settings subsystem prematurely.

## ADR-010 — Subtitle algorithms remain upstream foundation in V0.1

Accepted.

Kisu productizes subtitle behavior without copying its processing engine.

---

# 25. V0.1 non-goals

V0.1 does not require:

- PDF translation;
- EPUB translation;
- standalone text translation product;
- account/cloud backend;
- proprietary translation backend;
- theme marketplace;
- plugin architecture;
- full framework migration;
- full TypeScript conversion;
- total legacy Settings replacement;
- total MUI removal;
- new subtitle algorithm;
- custom translation model router;
- perfect parity across every upstream target.

---

# 26. V0.1 architecture acceptance gate

Architecture implementation is successful when:

1. Kisu can identify a coherent stable KISS baseline.
2. ownership registry exists.
3. KCL exists and remains thin.
4. KCL contract tests cover the critical semantic mappings.
5. new Kisu product surfaces live mainly under Kisu-owned paths.
6. page/selection/YouTube product behavior is independent from direct upstream schema access.
7. legacy advanced behavior remains reachable where Kisu has not replaced it.
8. no destructive settings migration is required.
9. UI visual style can be changed without touching KCL/core.
10. a stable upstream upgrade can be performed through a documented integration branch.
11. carried patches are documented.
12. no unnecessary framework/build migration occurred.

---

# 27. Long-term direction

Kisu should evolve through evidence.

A capability may progress:

```text
KISS TRACK foundation
        ↓
Kisu FILTER exposure
        ↓
validated Kisu-specific requirements
        ↓
optional Kisu OWN implementation
```

Kisu should not assume KISS will always be the optimal foundation, but should also not build speculative abstraction for replacing it.

KCL provides a practical boundary that reduces lock-in without pretending upstream replacement is currently required.

The long-term goal is:

> **Kisu may become substantially different from KISS as a product while still extracting high-value engineering work from KISS as long as that relationship remains beneficial.**
