# Pull Request Relationship Analysis

> **Context:** Three Copilot-generated PRs were created to automate the release
> cycle and deployment pipeline. This document clarifies what each PR contains,
> how they relate to each other, and what action maintainers should take.

---

## Overview of the Three PRs

| PR | Title | Branch | Files changed |
|----|-------|--------|---------------|
| [#36](https://github.com/samueil/yahtzeeCompanion/pull/36) | chore: Setup Release Cycle Automation | `copilot/setup-release-cycle-automation` | `release.yml`, `CHANGELOG.md`, `app.json` |
| [#37](https://github.com/samueil/yahtzeeCompanion/pull/37) | feat: automate release cycle and deployment CI/CD pipeline | `copilot/automate-release-versioning-workflow` | `release.yml`, `deploy.yml`, `eas.json` |
| [#38](https://github.com/samueil/yahtzeeCompanion/pull/38) | Reconcile duplicate release.yml: merge PR #36 and PR #37 into a single authoritative CI/CD pipeline | `copilot/analyze-release-workflow` | `release.yml`, `deploy.yml`, `CHANGELOG.md`, `app.json`, `eas.json`, `package.json` |

---

## What Each PR Contains

### PR #36 — Release-only automation

**New files / changes:**
- `.github/workflows/release.yml` — manually triggered release workflow
  - `bump_type` input: `patch` / `minor` / `major`
  - Optional `release_version` override input
  - Strips `-SNAPSHOT` and timestamp suffixes from the current version
  - Updates `package.json` + `app.json` to the release version
  - Generates a CHANGELOG entry via an inline Node.js script
  - Commits release, creates annotated tag, then bumps to `X.Y.Z-SNAPSHOT`
  - Next-dev commit tagged `[skip ci]`; pushes to `HEAD:${{ github.ref_name }}` (branch-agnostic)
  - **No** GitHub Release creation
- `CHANGELOG.md` — placeholder stub
- `app.json` — adds missing `version` field set to `1.0.0`

**What is missing:** No deployment / distribution workflow, no EAS build configuration.

---

### PR #37 — Release + deployment automation

**New files / changes:**
- `.github/workflows/release.yml` — a **different** release workflow (incompatible with #36's)
  - `bump` input: `finalize` / `patch` / `minor` / `major` (`finalize` is new)
  - No optional `release_version` override
  - Strips `-dev` / `-SNAPSHOT` suffixes (narrower regex than #36)
  - Shell-based changelog generation (exported as a step output)
  - Creates a **GitHub Release** via `actions/github-script`
  - Next-dev suffix is `-dev` (not `-SNAPSHOT`)
  - Push is hardcoded to `main` (not branch-agnostic)
  - `cache: npm` on Node.js setup; heredoc-style Node.js inline scripts
- `.github/workflows/deploy.yml` — **new file, absent in #36**
  - Fires on `v*.*.*` tags (produced by the release workflow) or `workflow_dispatch`
  - **Android:** `./gradlew assembleDebug` → APK uploaded as workflow artifact; optional Firebase App Distribution
  - **iOS:** `eas build --platform ios --profile preview` in Expo cloud (no macOS runner needed); EAS generates a QR-code install link; optional Firebase
- `eas.json` — EAS build profiles: `development`, `preview` (internal APK/IPA), `production` (auto-increment)

**What is missing:** `CHANGELOG.md` placeholder, `app.json` version field.

**Conflict with #36:** Both PRs add `.github/workflows/release.yml` as a brand-new file with different content. Merging both into `main` would cause a destructive overwrite of whichever is merged second (or a merge conflict if merged on the same base).

---

### PR #38 — Consolidated "best of both" PR

PR #38 was created specifically to reconcile #36 and #37. It contains **all six affected files** and is the **superset of both previous PRs**, combining the best features from each.

**`release.yml` — merged implementation:**

| Feature | Source |
|---------|--------|
| `finalize` bump mode | PR #37 |
| Optional `release_version` override input | PR #36 |
| Shell-based changelog (exported as step output) | PR #37 |
| GitHub Release creation via `actions/github-script` | PR #37 |
| Broader suffix-stripping regex (`-dev`, `-SNAPSHOT`, `-alpha`, `-beta`, `-rc`, timestamps) | PR #36 (extended) |
| Branch-agnostic `git push origin HEAD:${{ github.ref_name }}` | PR #36 |
| `[skip ci]` on next-dev commit | PR #36 |
| `cache: npm` on Node.js setup | PR #37 |

**`deploy.yml`** — taken from PR #37 (not present in PR #36).

**`eas.json`** — taken from PR #37.

**`CHANGELOG.md`** — taken from PR #36 (stub).

**`app.json` + `package.json`** — both updated to `1.0.0-dev`, establishing the development-cycle suffix convention.

---

## Relationship Summary

```
PR #36  ──┐
           ├─→  PR #38  (union / superset — best-of-both reconciliation)
PR #37  ──┘
```

- **PR #36 and PR #37 are sibling PRs** — both created from the same `main` base to address the same goal (release automation) but with different scopes and incompatible `release.yml` implementations.
- **PR #38 supersedes both** — it was explicitly created to merge the two incompatible approaches into one authoritative implementation. Its own description states: *"Close PR #36 and PR #37 without merging — this PR is their union."*
- **PR #38 does not depend on #36 or #37 being merged first** — it is a standalone, self-contained change that targets `main` directly.

---

## Actionable Guidance

### ✅ Recommended action

1. **Review and merge PR #38.**  
   It contains the complete, reconciled CI/CD automation (release workflow + deployment workflow + EAS config + changelog + version fields). No coordination with #36 or #37 is needed.

2. **Close PR #36 without merging.**  
   It is fully superseded by PR #38. Add a note: *"Superseded by #38 which includes all changes from this PR plus improvements from #37."*

3. **Close PR #37 without merging.**  
   It is fully superseded by PR #38. Add a note: *"Superseded by #38 which includes all changes from this PR plus improvements from #36."*

### ⚠️ Do NOT merge #36 and #37 (in any order)

Merging either PR individually would leave the implementation incomplete and produce conflicts or destructive overwrites when attempting to merge the other.

### Before merging PR #38 — one-time setup steps

The workflows in PR #38 require the following outside of GitHub Actions (done once by a maintainer with the relevant accounts):

| Step | Details |
|------|---------|
| **Enable write permissions** | Repository → Settings → Actions → General → Workflow permissions → "Read and write permissions" |
| **EAS: init + credentials** | Run `npx eas init` and `npx eas credentials` locally, then store the `EXPO_TOKEN` secret in repository settings |
| **Firebase (optional)** | Create a Firebase project, add Android/iOS apps, store `FIREBASE_APP_ID_ANDROID`, `FIREBASE_APP_ID_IOS`, and `FIREBASE_TOKEN` secrets — required only if you want Firebase App Distribution uploads |

Once merged and configured, trigger the release workflow manually via **Actions → Release → Run workflow** and select the desired bump type.
