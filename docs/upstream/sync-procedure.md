# Upstream sync procedure

Authority: `KISU-ARCHITECTURE-v2.md` sections 4.2, 4.4, 22 and `KISU-ROADMAP-v2.md` P8.

## When to sync

Estimated cadence, not a schedule:

- continuous observation of releases and important `dev` changes
- one upstream intake review per week (`intake/TEMPLATE.md`)
- one integration assessment at each Kisu milestone boundary
- integration from an appropriate stable KISS release
- **no obligation to sync merely because a KISS release exists**

Kisu's product schedule controls integration, not upstream's release schedule.

## Choosing a baseline

Do not automatically choose the newest tag. Decide on:

- security
- browser compatibility
- critical-flow fixes
- integration cost
- dependency coherence
- whether the candidate is meaningfully better than the current baseline

Record the decision as an intake report, then update `baseline.json`.

## Steps

```bash
git fetch upstream --tags
git fetch origin

# verify the fetch actually landed — see caveat below
git show-ref --tags | tail
git for-each-ref refs/upstream

git checkout -b upstream-sync/<date> next
# integrate the selected stable baseline
```

Resolve conflicts in this order:

1. **TRACK first** — take upstream's version unless a carried patch applies.
2. **KCL second** — adapt the compatibility layer to upstream's new reality.
3. **Kisu OWN surfaces last** — they should need no change if the boundary is healthy.

Never "resolve" a conflict by deleting Kisu behaviour. If a conflict cannot be resolved
without doing so, stop and raise an architecture review.

## Verification sequence

Run in this order. A failure stops the sync.

1. upstream tests
2. KCL contract tests
3. Kisu unit/component tests
4. primary-flow browser smoke tests
5. YouTube SPA smoke
6. settings migration tests

Then build Chrome and Firefox and revalidate every carried patch.

## Carried patch revalidation

For every active `KP-*`:

- is it still required?
- does upstream now provide an equivalent hook?
- does it conflict?
- is the test still valid?

Remove obsolete patches and record the pass in `carried-patches.md`.

## Integration health report

Record:

- number of conflicts
- conflict hotspots
- TRACK-owned LOC touched
- carried patch count
- KCL changes
- semantic changes
- whether ownership boundaries need adjustment

If the same files conflict every time, repair the architecture before releasing.

---

## Caveat: verify the fetch, do not trust its output

In the environment where this baseline was established, git silently failed to persist
refs under nested paths. `git fetch` printed `* [new branch] x -> refs/remotes/...` and
`git update-ref` returned success, but nothing was written to loose refs or `packed-refs`,
and the freshly created empty directory was reclaimed.

Consequences if unverified:

- `git branch -a` shows no remote branches
- `git rev-parse upstream/dev` fails with "ambiguous argument"
- a sync could silently integrate the wrong or an unchanged baseline

Therefore, after every fetch, confirm with `git show-ref` or `git for-each-ref` that the
intended refs exist and point where expected. Do not rely on fetch output.

Remote configurations were deliberately left standard rather than baking a workaround in.
Confirm whether this is an environment defect or a local git installation problem before
institutionalising a workaround.
