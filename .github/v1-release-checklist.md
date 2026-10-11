# Zettel Linter v1.0.0 Release Preparation Checklist

This checklist covers repository administrative settings, security configurations, and external release steps required for the `v1.0.0` release that **cannot be automated or committed directly via a pull request**.

---

## 1. GitHub Repository Settings & Branding
- [ ] **Repository Description & Website**: Ensure the repository description, tags/topics (`zettelkasten`, `markdown`, `linter`, `cli`, `typescript`), and website URL are configured in GitHub **Settings > General**.
- [ ] **Social Preview Image**: Upload a social preview image under **Settings > General > Social preview**.
- [x] **Default Branch Protection Rules**:
  - Go to **Settings > Branches** and enable branch protection for `main`.
  - [x] Require pull request reviews before merging.
  - [x] Require status checks to pass before merging (`Node.js CI`, CodeQL, etc.).
  - [x] Require signed commits (optional, recommended).
  - [x] Require linear history (optional).

---

## 2. Security & Vulnerability Management
- [x] **Dependabot Alerts & Security Updates**:
  - Go to **Settings > Code security and analysis**.
  - [x] Enable **Dependabot alerts**.
  - [x] Enable **Dependabot security updates**.
- [x] **Secret Scanning & Push Protection**:
  - [x] Enable **Secret scanning** (if available for public repository/tier).
  - [x] Enable **Push protection**.
- [x] **Private Vulnerability Reporting**:
  - [x] Enable **Private vulnerability reporting** in **Settings > Code security and analysis** so researchers can report security issues directly.

---

## 3. CI/CD Publishing & Permissions

- [x] **npm Trusted Publishing**:
  - [x] Configure npm trusted publishing for package `zettel-lint`, repository
    `zettel-lint/zettel-lint`, and workflow filename `npm-publish.yml`.
    `.github/workflows/npm-publish.yml` is the repository location of the
    workflow file.
  - [x] For eligible public package publishes from a public repository, npm
    generates provenance automatically when trusted publishing is used.
- [x] **GitHub Actions Workflow Permissions**:
  - Go to **Settings > Actions > General**.
  - [x] Use least-privilege permissions. Grant `contents: write` only to
    workflows or jobs that create tags or releases, and keep broader
    permissions narrower elsewhere.

---

## 4. Issue & Community Features
- [x] **GitHub Discussions**:
  - Go to **Settings > General** and enable **Discussions** for community Q&A, feature ideas, and announcements.
- [ ] **Issue Labels**:
  - Review and normalize issue labels in **Issues > Labels** (e.g. `bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`, `1.0.0`).
- [x] **Milestone 1.0.0**:
  - Create a `1.0.0` milestone in **Issues > Milestones** and assign remaining 1.0.0 issues.

---

## 5. Package Registry & External Services
- [x] **NPM Package Management**:
  - [x] Verify package ownership and maintainers on `npmjs.com/package/zettel-lint`.
- [x] **Integration Services (if applicable)**:
  - [x] Verify Codacy / Codecov / CodeQL integrations have appropriate repository permissions and webhooks active.

---

## 6. Final Release Execution
- [ ] **Draft Tag & Release Notes**:
  - Draft the `v1.0.0` release notes in **Releases > Draft a new release**.
  - Summarize major changes, migration guides (e.g. deprecation of `zl notes` in favor of `zl fix`), and CLI interface stability guarantees.
- [ ] **Publish v1.0.0 Release**:
  - Publish the release tag `v1.0.0` and trigger the automated npm publishing workflow.
