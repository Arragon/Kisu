# Upstream intake record

Copy this file to `docs/upstream/intake/YYYY-MM-DD-<release-or-window>.md` for each
meaningful release or weekly review.

Authority: `KISU-ARCHITECTURE-v2.md` sections 4.2, 4.5, 4.6.

```text
Upstream baseline/review:
Date:
Reviewed release/tag:
Reviewed dev range:

Security/browser changes:
Core behaviour changes:
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

## Field guidance

**Reviewed dev range** — record commit SHAs, not just dates. Example:
`c95bd46b..226e5780 (44 commits)`.

**ownership** — must match `ownership.md`. If a change does not fit an existing entry,
that is a signal the registry needs an update.

**decision vocabulary** — these describe product treatment, not Git commit selection:

| Decision | Meaning |
| --- | --- |
| ADOPT | Kisu should expose/use substantially as-is. |
| ADAPT | Useful capability, but Kisu should reshape semantics or UX. |
| REFERENCE | Implementation or idea is informative; do not integrate as product behaviour. |
| IGNORE | No meaningful Kisu value. |

**release urgency** — one of: none / next milestone / next release / immediate.
`immediate` should be rare and must be justified against the exceptional-intake criteria
in `README.md`. Using it obliges a `carried-patches.md` entry.

**Integration recommendation** — one of: do not integrate yet / roll into the next
`upstream-sync/*` branch / exceptional early intake (justify) / propose carried patch.

## Reminders

- Do not merge as part of the review. The review produces a report; integration happens
  through a documented `upstream-sync/*` branch.
- Do not describe Kisu's treatment of a change in commit-selection terms. Do not build
  a selective-history fork.
- A capability's code existing upstream does not imply product endorsement.
