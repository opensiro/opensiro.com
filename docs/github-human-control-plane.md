# HTML-only GitHub harness control plane

Status: proposal / implementation branch

This branch explores an authenticated human control plane for GitHub harnesses through opensiro.com, without introducing an OpenSiro application database or a second source of truth.

## Architecture label

Use this wording externally and in implementation notes:

> **opensiro.com is an HTML-only control plane for GitHub harnesses.**

Supporting technical invariant:

> **GitHub is the source of truth.**

`HTML-only` describes the OpenSiro product surface: the application UI and product logic live in browser-delivered HTML/CSS/JS, while durable identity, repository state, provenance, and user-authorized actions stay in GitHub.

A narrow stateless serverless authentication bridge is permitted only if GitHub OAuth cannot be completed safely from the browser without exposing credentials. That bridge is authentication infrastructure, not an OpenSiro application backend: it must not own product state or introduce a product database.

Avoid `third-party-less`: GitHub itself is an external service. Avoid describing opensiro.com as a projection layer; the intended product concept is a control plane over GitHub-hosted harnesses and OpenSiro artifacts.

## Core invariant

**GitHub is the source of truth. opensiro.com is an HTML-only control plane for GitHub harnesses.**

Do not add a persistent OpenSiro user/account database for this feature.

State should come from GitHub or existing OpenSiro repositories:

- identity -> GitHub profile
- maintained projects -> GitHub repositories and repository permissions
- stars -> GitHub starring state
- assessment state -> OpenSiro index/research artifacts
- contribution history -> commits, issues, pull requests, and assessment artifacts
- requests/corrections/evidence -> GitHub issues or pull requests
- conformance work -> repository artifacts and GitHub workflow state

Disposable caches may be added later for performance, but they must never become authoritative state.

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
        +-- OpenSiro artifacts

optional narrow boundary:
OAuth code -> stateless serverless auth exchange -> GitHub token
```

The optional serverless component must:

1. exist only where browser-only OAuth would expose credentials or otherwise weaken security;
2. keep no product database;
3. store no durable OpenSiro user profile;
4. perform only the minimum authentication/token duties required;
5. return control to the browser, which then interacts with GitHub under the user's authorization.

## Explicit non-goals

Do not introduce these merely to support login or personalization:

- Supabase/Firebase-style application database
- Auth0/Clerk-style identity layer
- OpenSiro usernames or passwords
- OpenSiro-owned social graph
- separate assessment/contribution ledger
- duplicated repository ownership state
- duplicated star state
- durable sessions whose authoritative identity differs from GitHub

## Initial human flows

### 1. Star OpenSiro

After GitHub authentication, show the selected OpenSiro repositories and their current star state, then let the user explicitly star the chosen set.

The UI must show exactly which repositories will be affected before any write action.

### 2. Discover my projects

Read the authenticated user's relevant public repositories and map them against the OpenSiro index.

Possible states:

- already assessed
- reassessment available/requested
- present in the index but not owned by this user
- not yet assessed

### 3. Project maintainer actions

For a repository the authenticated user can demonstrably maintain, surface actions such as:

- view current assessment
- submit evidence
- request reassessment
- propose a correction
- start a conformance path

The resulting durable artifact should be an issue, pull request, commit, or other GitHub-native object rather than a row in an OpenSiro database.

### 4. Contributor view

Build a contributor view dynamically from GitHub/OpenSiro artifacts rather than storing a separate profile.

Examples:

- assessments contributed
- evidence additions
- upstream changes
- OpenSiro repositories touched

This is a derived view over GitHub/OpenSiro artifacts, not a separate reputation system or datastore.

## Permission policy

Request the minimum GitHub permissions needed for each action.

Read-only views should not require write permissions. Write permissions should be requested only when the user initiates a write-capable flow such as starring, opening an issue, or contributing a repository change.

Private repository access is out of scope for the first version unless a concrete OpenSiro use case requires it.

## Privacy model

Default expectation:

- no OpenSiro account database;
- no durable copy of the GitHub profile;
- no durable copy of the user's repository list;
- no analytics-derived identity profile required for the feature;
- GitHub/OpenSiro public artifacts remain the durable provenance layer.

Any future cache must be documented as disposable and non-authoritative.

## Implementation phases

### Phase 0 — architecture boundary

- keep the existing static site intact;
- decide GitHub App vs OAuth App from the minimum-permission requirements;
- define the exact auth/token boundary;
- add no database.

### Phase 1 — identity + multi-star

- sign in with GitHub;
- display authenticated GitHub identity;
- read star state for the selected OpenSiro repositories;
- explicit multi-star confirmation UI;
- write stars through GitHub only.

### Phase 2 — project discovery

- discover relevant maintained public repositories;
- map them against the OpenSiro index;
- show assessment/conformance state dynamically.

### Phase 3 — GitHub-native actions

- submit candidate;
- request reassessment;
- submit evidence/correction;
- maintainer claim/verification flow where useful;
- create the durable result in GitHub.

## Acceptance criteria for the architecture

There is no OpenSiro application database to preserve.

A fresh browser session authenticated against GitHub must be able to reconstruct the useful human view from GitHub and existing OpenSiro artifacts alone.

If a serverless auth bridge disappears, only authentication/token exchange should be affected; no authoritative OpenSiro product state should be lost.
