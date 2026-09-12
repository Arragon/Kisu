# Upstream ownership registry

Authority: `KISU-ARCHITECTURE-v2.md` section 3, `KISU-ROADMAP-v2.md` P0-T03.

Kisu does not classify individual commits. It classifies **subsystems and capabilities**.
This registry is the operational form of that decision.

## Modes

| Mode | Meaning |
| --- | --- |
| **TRACK** | KISS is the implementation authority by default. Kisu integrates upstream evolution and keeps local changes minimal. |
| **FILTER** | Kisu accepts the upstream implementation foundation but decides whether, where and how the capability appears in the product. |
| **OWN** | Kisu is the implementation and product authority. Upstream changes are reference material, not merge targets. |

## Registry

| Area | Mode | Kisu owner | Notes |
| --- | --- | --- | --- |
| browser / runtime integration | TRACK | upstream / KCL | no product divergence |
| request infrastructure | TRACK | upstream / KCL | |
| base storage mechanisms | TRACK | upstream / KCL | Kisu-owned keys only where no upstream concept exists |
| translator core | TRACK | upstream / KCL | `src/libs/translator.js`, `translatorManager.js` |
| provider framework | TRACK | upstream / KCL | `src/apis/*`, `src/config/api.js` |
| provider exposure | FILTER | product | which providers appear, naming, ordering, role assignment |
| DOM translation engine | TRACK | upstream / KCL | |
| site rule engine | TRACK | upstream / KCL | `src/libs/rules.js`, `src/config/rules.js` |
| selection trigger & lifecycle | TRACK | upstream / KCL | `useSelectionController.js` and friends |
| selection presentation | OWN | Kisu | `src/kisu/product/selection` |
| selection capability decoding | FILTER | product | see note S-1 below |
| caption acquisition | TRACK | upstream / KCL | most upstream-fragile area, see note Y-1 |
| subtitle processing / segmentation | TRACK | upstream / KCL | |
| subtitle processing foundation | TRACK | upstream / KCL | |
| advanced subtitle capability exposure | FILTER | product | mode naming, context-mode exposure |
| subtitle runtime control surface | FILTER | product | currently blocked by upstream, see KP-001 |
| Popup product surface | OWN | Kisu | |
| page translation product flow | FILTER | product | Kisu owns presentation, upstream owns execution |
| YouTube control presentation | OWN | Kisu | |
| onboarding | OWN | Kisu | |
| Simple Settings | OWN | Kisu | |
| legacy Advanced settings | TRACK | upstream | kept reachable during V0.1 |
| product information architecture | OWN | Kisu | |
| feature exposure | OWN | Kisu | |
| Kisu defaults | OWN | Kisu | |
| visual system / design tokens | OWN | Kisu | |
| security patches | TRACK | upstream | never diverged on |

## Notes

**S-1 — selection capability decoding.** The word-vs-sentence and dictionary-vs-translation
decision currently lives inline, unexported, inside `src/views/Selection/TranForm.js`
render logic (`TranForm.js:179-235`). Upstream exposes no intent-level function. The
capability *decision* is therefore FILTER-owned by Kisu, while the *request execution*
remains TRACK. Kisu must not copy request logic to achieve this. See `control-paths.md`.

**Y-1 — caption acquisition fragility.** Discovery depends on regex-extracting
`ytInitialPlayerResponse` from the watch page HTML (`youtubeCaptionTracks.js:149-157`)
plus an XHR interceptor for `timedtext` (`src/injectors/xmlhttp.js:12`). It does not hook
`fetch`. Any change to YouTube internals breaks this. TRACK, and a watch-stream item.

## FILTER to OWN promotion gate

Promotion requires most of the following, and must be recorded as an ADR:

1. Kisu has a stable independent implementation.
2. Upstream behaviour repeatedly conflicts with Kisu product requirements.
3. Integration conflicts in that subsystem are recurring and expensive.
4. KCL can no longer isolate the differences cleanly.
5. Kisu has adequate regression coverage for the subsystem.
6. Taking ownership is expected to reduce, not increase, long-term maintenance.
7. The team explicitly accepts future browser/security/compatibility maintenance there.

## Updating this registry

Update only when responsibility meaningfully changes. Record the change in the table
below rather than silently editing the registry.

| Date | Area | From | To | Reason | ADR |
| --- | --- | --- | --- | --- | --- |
| 2026-09-13 | initial registry | — | — | seeded from architecture section 3.5 and roadmap P0-T03 | — |
