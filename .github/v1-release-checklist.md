# Zettel Linter v1.0.0 Release Preparation Checklist

This checklist covers repository administrative settings, security configurations, and external release steps required for the `v1.0.0` release that **cannot be automated or committed directly via a pull request**.

---

## 1. GitHub Repository Settings & Branding
- [ ] **Repository Description & Website**: Ensure the repository description, tags/topics (`zettelkasten`, `markdown`, `linter`, `cli`, `typescript`), and website URL are configured in GitHub **Settings > General**.
- [ ] **Social Preview Image**: Upload a social preview image under **Settings > General > Social preview**.
- [ ] **Default Branch Protection Rules**:
  - Go to **Settings > Branches** and enable branch protection for `main`.
  - [ ] Require pull request reviews before merging.
  - [ ] Require status checks to pass before merging (`Node.js CI`, CodeQL, etc.).
  - [ ] Require signed commits (optional, recommended).
  - [ ] Require linear history (optional).

---

## 2. Security & Vulnerability Management
- [ ] **Dependabot Alerts & Security Updates**:
  - Go to **Settings > Code security and analysis**.
  - [ ] Enable **Dependabot alerts**.
  - [ ] Enable **Dependabot security updates**.
- [ ] **Secret Scanning & Push Protection**:
  - [ ] Enable **Secret scanning** (if available for public repository/tier).
  - [ ] Enable **Push protection**.
- [ ] **Private Vulnerability Reporting**:
  - [ ] Enable **Private vulnerability reporting** in **Settings > Code security and analysis** so researchers can report security issues directly.

---

## 3. CI/CD Secrets & Permissions
- [ ] **NPM Publishing Token**:
  - [ ] Generate an npm automation access token on [npmjs.com](https://www.npmjs.com/).
  - [ ] Add the token as a repository secret named `NPM_TOKEN` under **Settings > Secrets and variables > Actions**.
- [ ] **GitHub Actions Workflow Permissions**:
  - Go to **Settings > Actions > General**.
  - [ ] Verify **Workflow permissions** are set to "Read and write permissions" (or configured with explicit `permissions` block in workflow YAML files) to allow automated tagging and release creation.

---

## 4. Issue & Community Features
- [ ] **GitHub Discussions**:
  - Go to **Settings > General** and enable **Discussions** for community Q&A, feature ideas, and announcements.
- [ ] **Issue Labels**:
  - Review and normalize issue labels in **Issues > Labels** (e.g. `bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`, `1.0.0`).
- [ ] **Milestone 1.0.0**:
  - Create a `1.0.0` milestone in **Issues > Milestones** and assign remaining 1.0.0 issues.

---

## 5. Package Registry & External Services
- [ ] **NPM Package Management**:
  - [ ] Verify package ownership and maintainers on `npmjs.com/package/zettel-lint`.
  - [ ] Confirm package provenance is enabled for builds.
- [ ] **Integration Services (if applicable)**:
  - [ ] Verify Codacy / Codecov / CodeQL integrations have appropriate repository permissions and webhooks active.

---

## 6. Final Release Execution
- [ ] **Draft Tag & Release Notes**:
  - Draft the `v1.0.0` release notes in **Releases > Draft a new release**.
  - Summarize major changes, migration guides (e.g. deprecation of `zl notes` in favor of `zl fix`), and CLI interface stability guarantees.
- [ ] **Publish v1.0.0 Release**:
  - Publish the release tag `v1.0.0` and trigger the automated npm publishing workflow.
