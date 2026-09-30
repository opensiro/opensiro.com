# HTML-only GitHub harness control plane

Status: proposal / implementation branch

This branch explores an authenticated human control plane for GitHub harnesses through opensiro.com, without introducing an Opensiro application database or a second source of truth.

## Architecture label

Use this wording externally and in implementation notes:

> **opensiro.com is an HTML-only control plane for GitHub harnesses.**

Supporting technical invariant:

> **GitHub is the source of truth.**

`HTML-only` describes the Opensiro product surface: the application UI and product logic live in browser-delivered HTML/CSS/JS, while durable identity, repository state, provenance, and user-authorized actions stay in GitHub.

A narrow stateless serverless authentication bridge is permitted only if GitHub OAuth cannot be completed safely from the browser without exposing credentials. That bridge is authentication infrastructure, not an Opensiro application backend: it must not own product state or introduce a product database.

Avoid `third-party-less`: GitHub itself is an external service. Avoid describing opensiro.com as a projection layer; the intended product concept is a control plane over GitHub-hosted harnesses and Opensiro artifacts.

## Core invariant

**GitHub is the source of truth. opensiro.com is an HTML-only control plane for GitHub harnesses.**

Do not add a persistent Opensiro user/account database for this feature.

State should come from GitHub or existing Opensiro repositories:

- identity -> GitHub profile
- maintained projects -> GitHub repositories and repository permissions
- stars -> GitHub starring state
- assessment state -> Opensiro index/research artifacts
- contribution history -> commits, issues, pull requests, and assessment artifacts
- requests/corrections/evidence -> GitHub issues or pull requests
- conformance work -> repository artifacts and GitHub workflow state

Disposable caches or local browser preferences may be added for convenience, but they must never become authoritative state.

## Runtime boundary

Preferred shape:

```text
browser: HTML / CSS / JS
        |
        | GitHub authorization + API calls
        v
      GitHub
        |
        +-- identity
        +-- stars
        +-- repositories
        +-- issues / PRs
        +-- Opensiro artifacts

optional narrow boundary:
OAuth code -> stateless serverless auth exchange -> GitHub token
```

The optional serverless component must:

1. exist only where browser-only OAuth would expose credentials or otherwise weaken security;
2. keep no product database;
3. store no durable Opensiro user profile;
4. perform only the minimum authentication/token duties required;
5. return control to the browser, which then interacts with GitHub under the user's authorization.

## Explicit non-goals

Do not introduce these merely to support login or personalization:

- Supabase/Firebase-style application database
- Auth0/Clerk-style identity layer
- Opensiro usernames or passwords
- Opensiro-owned social graph
- separate assessment/contribution ledger
- duplicated repository ownership state
- duplicated star state
- durable sessions whose authoritative identity differs from GitHub

## Initial human flows

### 1. Star Opensiro

After GitHub authentication, show the relevant Opensiro repositories and their current star state.

The control plane should support both:

- selecting individual repositories to star;
- a clear **Star all Opensiro repos** action for users who want to support/follow the whole Opensiro repository set in one step.

`Star all Opensiro repos` is a bulk write action, not a hidden shortcut. Before executing it, the UI must show the exact repositories that will be affected and indicate which ones are already starred. The user must explicitly confirm the action.

The bulk action should only write missing stars; already-starred repositories should remain unchanged. The result should report the effective outcome, for example `Starred 5 new repositories · 2 already starred`, rather than pretending every repository changed state.

The Opensiro repository set used by this action must come from an explicit maintained source/list rather than an accidental scrape of every repository in the organization. This lets Opensiro decide which repositories belong in the public multi-star surface.

All star writes go directly to GitHub under the authenticated user's authorization. Opensiro does not store a duplicate star ledger.

### 2. Discover and track my AI harnesses

Do **not** present every repository owned or maintained by the authenticated user as an Opensiro project.

Candidate discovery is intentionally narrow and heuristic. From the user's public repositories, surface only repositories that look plausibly harness-related from GitHub-visible metadata such as repository name, description, and topics. The initial heuristic should use a small configurable keyword set centered on terms such as `harness`; it may be expanded later when there is evidence that additional terms improve recall without making the candidate list noisy.

A heuristic match is only a candidate. It must not silently become an asserted harness identity.

For each candidate, offer an optional confirmation such as:

> **Is this your AI harness?**

The user may confirm it, dismiss it, or ignore it. Dismissal/confirmation is a UI preference, not an assessment result.

The same view must also allow the user to add a repository manually by GitHub repository URL or `owner/name`, including repositories that the heuristic did not catch.

For a confirmed or manually added harness, map it against the Opensiro Index and show the useful state, for example:

- assessed;
- reassessment available/requested;
- known to the Index but not currently associated with the authenticated maintainer;
- not yet assessed;
- assessment stale against a newer normative version;
- compatibility/reassessment status unresolved.

The purpose of this view is not merely repository discovery. It is a lightweight place for a maintainer to track how their harness currently stands relative to the Opensiro specification/profile over time.

### 3. Version-aware grade tracking

Never display an Opensiro grade as if it were timeless. A displayed grade must retain the normative versions it was assessed against.

Conceptually, the UI should be able to distinguish:

```text
Grade: A
assessed against: Spec X.Y / Profile A.B
current normative versions: Spec X'.Y' / Profile A'.B'
status: current | compatibility check needed | reassessment needed | unresolved
```

The exact field names should follow the canonical Opensiro artifacts rather than inventing a second grading schema in opensiro.com.

Expected specification behavior:

- specification version changes may change what compatibility means;
- a **specification major** should be treated as a meaningful compatibility boundary, because major revisions are expected to make criteria stricter and/or more detailed;
- therefore an old grade must not automatically be presented as current under a new specification major;
- the UI should surface that a compatibility evaluation or reassessment is required according to the normative versioning policy.

Profile-major behavior is intentionally **not frozen by this branch yet**. A large Profile major may ultimately require a full reassessment, but opensiro.com must not encode that as policy until the Profile/versioning rules define it. Until then, a grade crossing an unresolved Profile-major boundary should be shown as needing an explicit disposition rather than silently carried forward.

### 4. Tracking persistence without an Opensiro database

A manually added/confirmed harness does not justify an Opensiro account database.

Default behavior may keep convenience state locally in the browser (for example, which candidate was dismissed or which repository the user wants visible in the control plane). Local state is non-authoritative and may disappear.

If durable or cross-device tracking is later required, persistence must be an explicit GitHub-native artifact or another source-of-truth mechanism already governed by Opensiro. The exact artifact/schema is out of scope for this branch and must be designed before persistent tracking is implemented.

Assessment grades, evidence, normative versions, and reassessment decisions must always come from canonical Opensiro/GitHub artifacts, never from browser storage.

### 5. Project maintainer actions

For a repository the authenticated user can demonstrably maintain, surface actions such as:

- view current assessment;
- view which Spec/Profile versions the grade belongs to;
- inspect whether the assessment is current, stale, or requires a compatibility decision;
- submit evidence;
- request reassessment;
- propose a correction;
- start a conformance path.

The resulting durable artifact should be an issue, pull request, commit, or other GitHub-native object rather than a row in an Opensiro database.

### 6. Contributor view

Build a contributor view dynamically from GitHub/Opensiro artifacts rather than storing a separate profile.

Examples:

- assessments contributed
- evidence additions
- upstream changes
- Opensiro repositories touched

This is a derived view over GitHub/Opensiro artifacts, not a separate reputation system or datastore.

## Permission policy

Request the minimum GitHub permissions needed for each action.

Read-only views should not require write permissions. Write permissions should be requested only when the user initiates a write-capable flow such as starring, opening an issue, or contributing a repository change.

Private repository access is out of scope for the first version unless a concrete Opensiro use case requires it.

## Privacy model

Default expectation:

- no Opensiro account database;
- no durable copy of the GitHub profile;
- no durable copy of the user's repository list;
- no analytics-derived identity profile required for the feature;
- GitHub/Opensiro public artifacts remain the durable provenance layer.

Any future cache or local preference must be documented as disposable and non-authoritative.

## Implementation phases

### Phase 0 — architecture boundary

- keep the existing static site intact;
- decide GitHub App vs OAuth App from the minimum-permission requirements;
- define the exact auth/token boundary;
- add no database.

### Phase 1 — identity + multi-star

- sign in with GitHub;
- display authenticated GitHub identity;
- read star state for the maintained Opensiro multi-star repository set;
- allow individual repository selection;
- provide a first-class `Star all Opensiro repos` action;
- show the exact repository set before any bulk write;
- require explicit confirmation;
- skip already-starred repositories and report the effective result;
- write stars through GitHub only;
- store no duplicate star state in Opensiro.

### Phase 2 — harness discovery + tracking

- read the authenticated user's relevant public repositories;
- apply a conservative, configurable harness-keyword heuristic rather than showing all repositories;
- present heuristic matches as optional candidates with `Is this your AI harness?` confirmation;
- allow manual repository addition by URL or `owner/name`;
- map confirmed/manually added harnesses against the Opensiro Index;
- display grade plus the Spec/Profile versions the assessment belongs to;
- display whether that assessment is current, requires compatibility evaluation/reassessment, or has unresolved version-policy status;
- keep convenience tracking local unless/until a GitHub-native durable tracking artifact is explicitly designed.

### Phase 3 — GitHub-native actions

- submit candidate;
- request reassessment;
- submit evidence/correction;
- maintainer claim/verification flow where useful;
- create the durable result in GitHub.

## Acceptance criteria for the architecture

There is no Opensiro application database to preserve.

A fresh browser session authenticated against GitHub must be able to reconstruct authoritative identity, repository, assessment, grade, evidence, normative-version state, and current star state from GitHub and existing Opensiro artifacts alone. Local convenience choices are allowed to be absent in a fresh session.

A heuristic repository match must never be treated as proof that a repository is an AI harness; user confirmation or manual addition only controls the UI view and does not substitute for Opensiro assessment/admission.

A grade must not be presented without enough normative-version context to tell whether it is current under the applicable Spec/Profile policy.

The `Star all Opensiro repos` flow must always expose the exact maintained repository set and require explicit user confirmation before bulk writes.

If a serverless auth bridge disappears, only authentication/token exchange should be affected; no authoritative Opensiro product state should be lost.
