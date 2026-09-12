# Upstream governance

Kisu is an opinionated downstream product based on KISS Translator. This directory
holds the machine-readable and human-readable state of that relationship.

Authority: `KISU-ARCHITECTURE-v2.md` sections 4, 5 and 22, and `KISU-ROADMAP-v2.md` P0.

## Remotes

```text
origin     https://github.com/Arragon/Kisu.git              # Kisu fork
upstream   https://github.com/fishjar/kiss-translator.git   # KISS Translator (GPL-3.0)
```

## Two upstream streams

| Stream | Source | Purpose | Effect on Kisu |
| --- | --- | --- | --- |
| Watch | `upstream/dev` | Security fixes, browser/runtime regressions, schema and subtitle changes, capabilities worth evaluating, upcoming breaking changes | None automatically. Observation only. |
| Integration | Stable KISS release / tag | Establish a coherent upstream baseline | Merged through a documented `upstream-sync/*` branch |

`dev` is a watch source, not a release baseline. See ADR-003.

## Current baseline

Recorded in `baseline.json`. Current state:

- integration baseline: `v2.0.32` at commit `7dfc03eb`
- watched dev commit: `226e5780` (observed 2026-09-13, 44 commits ahead of baseline)
- exceptional upstream patches: none

## Branch topology

```text
main              Kisu release-quality line, currently at the v2.0.32 baseline
next              integration branch
feature/*         short-lived
upstream-sync/*   temporary upstream integration branches
```

`origin/dev` is a legacy ref. It holds the original fork point (`c95bd46b`, 35 commits
ahead of `v2.0.32`) plus the design documents. It must not be used as an integration
source. Keeping it is intentional: it preserves provenance.

`git rerere` is enabled locally.

## Refreshing the watch state

`git fetch upstream --tags` picks up new release tags.

Note on remote-tracking refs: in the environment where this baseline was established,
git silently failed to persist refs under `refs/remotes/**` (the command reported
success, but no ref was written to loose refs or `packed-refs`). Flat refs created
directly under a new namespace, such as `refs/upstream/dev`, do persist. Remote
configurations were left standard rather than baking this workaround into the
repository. Verify on a clean checkout before relying on `git fetch` updating
remote-tracking refs.

## Cadence

- continuous observation of releases and important `dev` changes
- one upstream intake review per week
- one integration assessment at each Kisu milestone boundary
- no obligation to sync merely because a release exists

Use `intake/TEMPLATE.md` for each review.

## Exceptional early intake

An `upstream/dev` commit may be taken before a stable release only for: security issues,
serious browser breakage, data corruption, provider-wide outage caused by upstream
behaviour, a confirmed critical bug in one of the three primary flows, or a capability
that blocks an active milestone with sufficiently isolated dependencies.

Every such patch is recorded in `baseline.json` and in `carried-patches.md`.

## Do not build a selective-history fork

Taking commit A, skipping B, reimplementing D and skipping F creates hidden dependency
problems and obscures upstream ancestry. Prefer one coherent stable baseline plus a
small, explicit, revertible carried-patch set.

## Verification

```bash
git remote -v
git branch --show-current
cat docs/upstream/baseline.json
git rev-parse v2.0.32^{commit}
```
