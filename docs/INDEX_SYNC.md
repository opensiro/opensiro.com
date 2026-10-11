# Canonical Index to static website synchronization

Canonical source: https://github.com/opensiro/vsm-harness-index (main).
Consumer: https://github.com/opensiro/opensiro.com (main).

## Triggers and authorization

The Index workflow in .github/workflows/notify-website.yml listens for
a **successful push validation** (workflow_run, validate, main) and sends
repository_dispatch with type **vsm-index-main-updated** and an Index SHA.
A website source commit is neither required nor used as the trigger.

Configure **one** credential as Actions secrets in **vsm-harness-index**:

- Preferred: WEBSITE_DISPATCH_APP_ID and WEBSITE_DISPATCH_PRIVATE_KEY,
  from a GitHub App installed on the opensiro.com repository with
  repository Contents: write permission. This mints a short-lived
  repository-scoped token.
- Alternative: WEBSITE_DISPATCH_TOKEN, a fine-grained token restricted to
  opensiro/opensiro.com with repository Contents: write permission.
  Avoid organization-wide classic PATs. Never store or print tokens.

These are Index Actions secrets, **not frontend environment variables**.
If missing, notification logs a warning and exits without claiming delivery;
hourly reconciliation remains enabled at minute 17 UTC.

## Materialization

The website sync workflow accepts repository_dispatch, schedule and manual
dispatch. It always checks out the **latest canonical Index main** with
full Git history, not a materialized website artifact. The event SHA is a
notification, not a source override, so old notifications are safe.
Duplicate notifications already matching the published Index SHA are skipped.

Generation produces the static Index, both monitors, home preview, metrics
and JS chunks, and writes assets/harness-index/source-manifest.json. This
manifest records the exact Index source SHA and URL, snapshot revision,
source update time, included-entry count, and full-row chunk name.

The provenance checker verifies the manifest against the canonical source
marker and generated harness snapshot. Failed generation, source validation
or static tests prevent a commit or deployment.

Before committing, the workflow checks live Index main again. If Index
advanced, it stops without publishing stale files and dispatches another
sync. Serialized runs and the hourly reconciler provide eventual convergence.
If Index advances after the final check, a newer queued event or the hourly
fallback handles it.

Generated changes are committed only for allowlisted outputs, and a separate
Pages workflow is explicitly dispatched because pushes using GITHUB_TOKEN
do not automatically trigger other workflows. A no-op sync does not dispatch
Pages. The deploy workflow checks out latest website main and validates all
static outputs and provenance before publication.

No HTML source edits, runtime GitHub API queries or frontend framework.

## Verify production

1. Verify the Index main validate workflow and the notify-website run.
2. Verify website Sync canonical VSM Index snapshot run: actual source SHA,
   generated outputs, provenance, tests and changed-file commit.
3. If there was a commit, inspect the separate Deploy static content to Pages
   workflow and its github-pages environment outcome.
4. Verify https://opensiro.com/assets/harness-index/source-manifest.json
   reports that SHA. Inspect Henterprise in /harness-monitor.html and
   /harness-server.html: S1, S2, S3, S3*, S4, S5 are all A.

Do not infer production success from Index CI, a local build or an Actions
dispatch without a successful Pages deployment and served-content check.

Local regression: run node --test tests/*.test.cjs, and run the source-snapshot
test with CANONICAL_INDEX_ROOT pointing at the exact Index checkout *after*
materializing the website from that checkout.
