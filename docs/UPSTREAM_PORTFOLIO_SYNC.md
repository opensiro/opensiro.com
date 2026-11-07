# Public Upstream PR lifecycle — website publication

Canonical source: [opensiro/upstream](https://github.com/opensiro/upstream)
`main`, using its separately owned
[`scripts/portfolio_reconcile.py`](https://github.com/opensiro/upstream/blob/main/scripts/portfolio_reconcile.py)
and exact reviewed PR source cohorts. Website consumer:
[`upstream-portfolio.html`](../upstream-portfolio.html).

## What is published

The [daily or manually dispatched sync](../.github/workflows/sync-upstream-portfolio.yml)
checks out the latest Upstream `main`, validates its 25 distinct PR URL union,
and makes one read-only GitHub PR observation. The website renderer validates
the v1 JSON schema and its SHA256 source-cohort identity, then publishes:

- the separately owned **18-target operational** resolved-only acceptance
  fraction (merged / merged plus closed without merge);
- the **25-URL broader descriptive union**, not a replacement denominator;
- open and unverifiable counts, exact GitHub PR links, observation timestamp,
  and Upstream source commit SHA;
- [`assets/upstream-portfolio-observation.json`](../assets) as the dated,
  machine-readable source observation (after the first successful sync).

This page **does not** assert Organization `verified_external_outcomes` or
product adoption. Product-native fit is **DEPRECATED**. Merge status alone
does not prove deploy, product benefit, reviewer motives or VSM S2 improvement.

## Guarded materialization

1. The source is checked out at an exact SHA, independent of any website
   representation. If any GitHub PR read fails, the source is misidentified,
   the known-unverifiable exception changes, or the cohort fingerprint/count
   mismatches, the sync stops before publication.
2. The website renderer uses only Node's standard library and requires exactly
   18 watchlist and 25 union URLs. Its output is one generated HTML page plus
   one JSON file. It never changes the Index, the Organization metrics block,
   historical Upstream receipt or any external repository.
3. The workflow checks that Upstream `main` did not change mid-observation,
   verifies tests and limits commits to the two generated site outputs.
4. It shares the existing `vsm-index-sync` concurrency group with the canonical
   Index site sync, commits the generated outputs to site `main`, and explicitly
   requests the existing GitHub Pages deploy. No browser-time GitHub API calls
   or public API credentials are used.
5. A scheduled deployment of this change is not evidence that a live sync
   succeeded. Verify the exact source SHA, workflow run, deployed Pages run,
   served HTML and JSON timestamp before claiming production freshness.

The initial page deliberately shows **awaiting first verified publication**.
If the first sync cannot run (e.g. permission, external GitHub API or branch
protection), it does not invent a numeric KPI. Previously published snapshots
are source-dated and may become stale during a failed sync.

Offline tests: `node --test tests/upstream-portfolio-sync.test.cjs tests/static-site.test.cjs`.
