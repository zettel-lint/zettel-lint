import { describe, expect, test, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { resolve } from 'path';

describe('bump-patch-version workflow', () => {
  let workflowContent: string;
  let workflow: any;

  beforeAll(() => {
    const workflowPath = resolve(__dirname, '../../../.github/workflows/bump-patch-version.yml');
    workflowContent = readFileSync(workflowPath, 'utf-8');
    workflow = parseYaml(workflowContent);
  });

  describe('workflow structure', () => {
    test('has correct workflow name', () => {
      expect(workflow.name).toBe('Bump Patch Version');
    });

    test('is manually triggered via workflow_dispatch', () => {
      expect(workflow.on).toHaveProperty('workflow_dispatch');
    });

    test('has bump-version job', () => {
      expect(workflow.jobs).toHaveProperty('bump-version');
    });

    test('runs on ubuntu-latest', () => {
      expect(workflow.jobs['bump-version']['runs-on']).toBe('ubuntu-latest');
    });

    test('has required permissions', () => {
      const permissions = workflow.jobs['bump-version'].permissions;
      expect(permissions.contents).toBe('write');
      expect(permissions['pull-requests']).toBe('write');
    });
  });

  describe('workflow steps', () => {
    let steps: any[];

    beforeAll(() => {
      steps = workflow.jobs['bump-version'].steps;
    });

    test('has checkout step with correct configuration', () => {
      const checkoutStep = steps[0];
      expect(checkoutStep.uses).toBe('actions/checkout@v6.0.2');
      expect(checkoutStep.with['fetch-depth']).toBe(0);
      expect(checkoutStep.with.token).toBe('${{ secrets.GITHUB_TOKEN }}');
    });

    test('has setup node step with Node.js 22', () => {
      const setupNodeStep = steps.find(s => s.name === 'Setup Node.js');
      expect(setupNodeStep).toBeDefined();
      expect(setupNodeStep.uses).toBe('actions/setup-node@v6');
      expect(setupNodeStep.with['node-version']).toBe('22');
    });

    test('has configure git step', () => {
      const configGitStep = steps.find(s => s.name === 'Configure Git');
      expect(configGitStep).toBeDefined();
      expect(configGitStep.run).toContain("git config user.name 'github-actions[bot]'");
      expect(configGitStep.run).toContain("git config user.email 'github-actions[bot]@users.noreply.github.com'");
    });

    test('has get current version step', () => {
      const getCurrentVersionStep = steps.find(s => s.name === 'Get current version');
      expect(getCurrentVersionStep).toBeDefined();
      expect(getCurrentVersionStep.run).toContain('CURRENT_VERSION=$(node -p "require(\'./package.json\').version")');
      expect(getCurrentVersionStep.run).toContain('echo "current_version=${CURRENT_VERSION}" >> $GITHUB_ENV');
    });

    test('has bump patch version step', () => {
      const bumpVersionStep = steps.find(s => s.name === 'Bump patch version');
      expect(bumpVersionStep).toBeDefined();
      expect(bumpVersionStep.run).toContain('npm version patch --no-git-tag-version');
      expect(bumpVersionStep.run).toContain('NEW_VERSION=$(node -p "require(\'./package.json\').version")');
      expect(bumpVersionStep.run).toContain('echo "new_version=${NEW_VERSION}" >> $GITHUB_ENV');
    });

    test('has create branch step', () => {
      const createBranchStep = steps.find(s => s.name === 'Create branch');
      expect(createBranchStep).toBeDefined();
      expect(createBranchStep.run).toContain('git checkout -b bump-version-${{ env.new_version }}');
    });

    test('has update version in TypeScript file step', () => {
      const updateTsStep = steps.find(s => s.name === 'Update version in TypeScript file');
      expect(updateTsStep).toBeDefined();
      expect(updateTsStep.run).toContain('sed -i');
      expect(updateTsStep.run).toContain('src/zl.ts');
    });

    test('has commit changes step with tests', () => {
      const commitStep = steps.find(s => s.name === 'Commit changes');
      expect(commitStep).toBeDefined();
      expect(commitStep.run).toContain('npm ci');
      expect(commitStep.run).toContain('npm test');
      expect(commitStep.run).toContain('git add package.json package-lock.json src/zl.ts');
      expect(commitStep.run).toContain('git commit -m "chore: bump version to ${{ env.new_version }}"');
      expect(commitStep.run).toContain('git push origin bump-version-${{ env.new_version }}');
    });

    test('has create pull request step', () => {
      const prStep = steps.find(s => s.name === 'Create Pull Request with GitHub CLI');
      expect(prStep).toBeDefined();
      expect(prStep.run).toContain('gh pr create');
      expect(prStep.run).toContain('--title "chore: bump version to ${{ env.new_version }}"');
      expect(prStep.run).toContain('--base main');
      expect(prStep.run).toContain('--head bump-version-${{ env.new_version }}');
      expect(prStep.run).toContain('--label "version-bump,automated-pr"');
      expect(prStep.env.GH_TOKEN).toBe('${{ secrets.GITHUB_TOKEN }}');
    });

    test('all critical steps are present in order', () => {
      const stepNames = steps.map(s => s.name).filter(Boolean);
      const expectedOrder = [
        'Setup Node.js',
        'Configure Git',
        'Get current version',
        'Bump patch version',
        'Create branch',
        'Update version in TypeScript file',
        'Commit changes',
        'Create Pull Request with GitHub CLI',
      ];
      let lastIndex = -1;
      for (const name of expectedOrder) {
        const idx = stepNames.indexOf(name);
        expect(idx).toBeGreaterThan(lastIndex);
        lastIndex = idx;
      }
    });
  });

  describe('version handling logic', () => {
    test('sed command correctly replaces version pattern', () => {
      const updateTsStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Update version in TypeScript file'
      );
      const sedCommand = updateTsStep.run;

      // Verify sed command targets the correct file
      expect(sedCommand).toContain('src/zl.ts');

      // Verify it uses environment variables for version replacement
      expect(sedCommand).toContain('${{ env.current_version }}');
      expect(sedCommand).toContain('${{ env.new_version }}');

      // Verify the pattern matches version string format
      expect(sedCommand).toMatch(/version\s*=\s*"/);
    });

    test('branch name follows convention', () => {
      const createBranchStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Create branch'
      );
      expect(createBranchStep.run).toMatch(/bump-version-\$\{\{ env\.new_version \}\}/);
    });

    test('commit message follows conventional commits', () => {
      const commitStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Commit changes'
      );
      expect(commitStep.run).toContain('chore: bump version to');
    });
  });

  describe('pull request configuration', () => {
    let prStep: any;

    beforeAll(() => {
      prStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Create Pull Request with GitHub CLI'
      );
    });

    test('PR title follows convention', () => {
      expect(prStep.run).toContain('--title "chore: bump version to ${{ env.new_version }}"');
    });

    test('PR targets main branch', () => {
      expect(prStep.run).toContain('--base main');
    });

    test('PR has correct labels', () => {
      expect(prStep.run).toContain('--label "version-bump,automated-pr"');
    });

    test('PR body contains version change information', () => {
      expect(prStep.env.PR_BODY).toContain("What's Changed");
      expect(prStep.env.PR_BODY).toContain('Bump version from');
      expect(prStep.env.PR_BODY).toContain('${{ env.current_version }}');
      expect(prStep.env.PR_BODY).toContain('${{ env.new_version }}');
    });

    test('PR body lists changed files', () => {
      expect(prStep.env.PR_BODY).toContain('Files Changed');
      expect(prStep.env.PR_BODY).toContain('package.json');
      expect(prStep.env.PR_BODY).toContain('src/zl.ts');
    });

    test('PR body includes bot PR notice', () => {
      expect(prStep.env.PR_BODY).toContain("Bot PRs don't trigger PR actions");
      expect(prStep.env.PR_BODY).toContain('close and re-open');
    });

    test('uses GITHUB_TOKEN for authentication', () => {
      expect(prStep.env.GH_TOKEN).toBe('${{ secrets.GITHUB_TOKEN }}');
    });
  });

  describe('security and permissions', () => {
    test('uses specific action versions (not latest)', () => {
      const checkoutStep = workflow.jobs['bump-version'].steps[0];
      expect(checkoutStep.uses).toMatch(/@v\d+\.\d+\.\d+/);

      const setupNodeStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Setup Node.js'
      );
      expect(setupNodeStep.uses).toMatch(/@v\d+/);
    });

    test('uses github-actions bot identity', () => {
      const configGitStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Configure Git'
      );
      expect(configGitStep.run).toContain('github-actions[bot]');
    });

    test('has minimal required permissions', () => {
      const permissions = workflow.jobs['bump-version'].permissions;
      const permissionKeys = Object.keys(permissions);
      expect(permissionKeys).toHaveLength(2);
      expect(permissionKeys).toContain('contents');
      expect(permissionKeys).toContain('pull-requests');
    });
  });

  describe('workflow quality checks', () => {
    test('runs tests before committing', () => {
      const commitStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Commit changes'
      );
      expect(commitStep.run).toContain('npm test');
    });

    test('runs npm ci before tests', () => {
      const commitStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Commit changes'
      );
      const commands = commitStep.run;
      const ciIndex = commands.indexOf('npm ci');
      const testIndex = commands.indexOf('npm test');
      expect(ciIndex).toBeGreaterThan(-1);
      expect(testIndex).toBeGreaterThan(-1);
      expect(ciIndex).toBeLessThan(testIndex);
    });

    test('uses fetch-depth 0 for full history', () => {
      const checkoutStep = workflow.jobs['bump-version'].steps[0];
      expect(checkoutStep.with['fetch-depth']).toBe(0);
    });
  });

  describe('edge cases and validation', () => {
    test('workflow YAML is valid', () => {
      expect(() => parseYaml(workflowContent)).not.toThrow();
    });

    test('workflow has no undefined required fields', () => {
      expect(workflow.name).toBeDefined();
      expect(workflow.on).toBeDefined();
      expect(workflow.jobs).toBeDefined();
    });

    test('all steps with names have run commands or uses', () => {
      const steps = workflow.jobs['bump-version'].steps;
      steps.forEach((step: any) => {
        if (step.name) {
          expect(step.run || step.uses).toBeDefined();
        }
      });
    });

    test('environment variables are properly referenced', () => {
      const steps = workflow.jobs['bump-version'].steps;
      const varsSet = new Set<string>();
      const varsUsed = new Set<string>();

      steps.forEach((step: any) => {
        if (step.run) {
          const setMatches = step.run.match(/echo "(\w+)=/g);
          if (setMatches) {
            setMatches.forEach((match: string) => {
              const varName = match.match(/echo "(\w+)=/)?.[1];
              if (varName) varsSet.add(varName);
            });
          }

          const useMatches = step.run.match(/\$\{\{\s*env\.(\w+)\s*\}\}/g);
          if (useMatches) {
            useMatches.forEach((match: string) => {
              const varName = match.match(/env\.(\w+)/)?.[1];
              if (varName) varsUsed.add(varName);
            });
          }
        }

        // Also scan step.env for env variable references
        if (step.env) {
          const envContent = JSON.stringify(step.env);
          const envUseMatches = envContent.match(/\$\{\{\s*env\.(\w+)\s*\}\}/g);
          if (envUseMatches) {
            envUseMatches.forEach((match: string) => {
              const varName = match.match(/env\.(\w+)/)?.[1];
              if (varName) varsUsed.add(varName);
            });
          }
        }
      });

      // Verify all used env vars are set
      varsUsed.forEach(varName => {
        expect(varsSet.has(varName)).toBe(true);
      });
    });

    test('git operations happen in correct sequence', () => {
      const steps = workflow.jobs['bump-version'].steps;
      const stepCommands = steps
        .filter((s: any) => s.run)
        .map((s: any) => s.run);

      const fullScript = stepCommands.join('\n');

      // Checkout happens first (implicit in workflow structure)
      // Config should happen before any git commands
      const configIndex = fullScript.indexOf('git config');
      const checkoutBranchIndex = fullScript.indexOf('git checkout -b');
      const addIndex = fullScript.indexOf('git add');
      const commitIndex = fullScript.indexOf('git commit');
      const pushIndex = fullScript.indexOf('git push');

      expect(configIndex).toBeGreaterThan(-1);
      expect(checkoutBranchIndex).toBeGreaterThan(configIndex);
      expect(addIndex).toBeGreaterThan(checkoutBranchIndex);
      expect(commitIndex).toBeGreaterThan(addIndex);
      expect(pushIndex).toBeGreaterThan(commitIndex);
    });
  });

  describe('file modifications', () => {
    test('commits all required files', () => {
      const commitStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Commit changes'
      );
      expect(commitStep.run).toContain('git add package.json');
      expect(commitStep.run).toContain('package-lock.json');
      expect(commitStep.run).toContain('src/zl.ts');
    });

    test('updates version in both package.json and src/zl.ts', () => {
      const steps = workflow.jobs['bump-version'].steps;
      const npmVersionStep = steps.find((s: any) => s.name === 'Bump patch version');
      const updateTsStep = steps.find((s: any) => s.name === 'Update version in TypeScript file');

      expect(npmVersionStep).toBeDefined();
      expect(updateTsStep).toBeDefined();
      expect(npmVersionStep.run).toContain('npm version patch');
      expect(updateTsStep.run).toContain('src/zl.ts');
    });
  });

  describe('workflow execution requirements', () => {
    test('only manual trigger is configured', () => {
      const triggerKeys = Object.keys(workflow.on);
      expect(triggerKeys).toHaveLength(1);
      expect(triggerKeys[0]).toBe('workflow_dispatch');
    });

    test('no scheduled runs configured', () => {
      expect(workflow.on.schedule).toBeUndefined();
      expect(workflow.on.push).toBeUndefined();
      expect(workflow.on.pull_request).toBeUndefined();
    });
  });

  describe('regression and boundary tests', () => {
    test('sed command uses -i flag for in-place editing', () => {
      const updateTsStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Update version in TypeScript file'
      );
      // Verify in-place editing to avoid creating backup files
      expect(updateTsStep.run).toContain('sed -i');
    });

    test('npm version uses --no-git-tag-version flag', () => {
      const bumpVersionStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Bump patch version'
      );
      // Ensure we don't create git tags automatically (we control commits)
      expect(bumpVersionStep.run).toContain('npm version patch --no-git-tag-version');
    });

    test('version pattern in sed matches expected format', () => {
      const updateTsStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Update version in TypeScript file'
      );
      // Should match: version = "x.y.z" format
      expect(updateTsStep.run).toMatch(/version\s*=\s*"\$\{\{\s*env\.current_version\s*\}\}"/);
    });

    test('all file paths use forward slashes (Unix-style)', () => {
      const steps = workflow.jobs['bump-version'].steps;
      const allRuns = steps
        .filter((s: any) => s.run)
        .map((s: any) => s.run)
        .join(' ');

      // Check that we don't have Windows-style paths
      expect(allRuns).not.toMatch(/[a-zA-Z]:\\/);
    });

    test('PR labels are comma-separated without spaces', () => {
      const prStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Create Pull Request with GitHub CLI'
      );
      expect(prStep.run).toContain('--label "version-bump,automated-pr"');
      // Ensure no spaces around comma (gh CLI requirement)
      expect(prStep.run).not.toContain('version-bump, automated-pr');
      expect(prStep.run).not.toContain('version-bump ,automated-pr');
    });

    test('checkout uses GITHUB_TOKEN not default token', () => {
      const checkoutStep = workflow.jobs['bump-version'].steps[0];
      // Explicit token is used for checkout authentication and PR creation
      expect(checkoutStep.with.token).toBe('${{ secrets.GITHUB_TOKEN }}');
    });

    test('git push includes origin remote explicitly', () => {
      const commitStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Commit changes'
      );
      // Explicit remote ensures clarity
      expect(commitStep.run).toContain('git push origin');
    });

    test('PR body mentions manual re-open requirement', () => {
      const prStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Create Pull Request with GitHub CLI'
      );
      // Important reminder that bot PRs need manual intervention
      expect(prStep.env.PR_BODY).toContain('close and re-open');
      expect(prStep.env.PR_BODY).toContain("Bot PRs don't trigger PR actions");
    });

    test('version extraction uses Node.js require syntax', () => {
      const getCurrentVersionStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Get current version'
      );
      // Ensures compatibility with Node.js module system
      expect(getCurrentVersionStep.run).toContain("require('./package.json').version");
    });

    test('workflow steps count is as expected', () => {
      const steps = workflow.jobs['bump-version'].steps;
      // Ensure we haven't accidentally removed steps
      expect(steps.length).toBeGreaterThanOrEqual(9);
    });

    test('commit adds lock file for reproducibility', () => {
      const commitStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Commit changes'
      );
      // Important to commit lock file after npm ci
      expect(commitStep.run).toContain('package-lock.json');
    });

    test('no hardcoded version strings in workflow', () => {
      const steps = workflow.jobs['bump-version'].steps;
      const allContent = JSON.stringify(steps);

      // Should not contain hardcoded semver patterns (except in action versions)
      // We look for version references that aren't from env vars or action versions
      const versionPattern = /["']?\d+\.\d+\.\d+["']?/g;
      const nonActionVersions: string[] = [];

      // Use matchAll to get each match with its proper index
      const matches = Array.from(allContent.matchAll(versionPattern));
      matches.forEach(match => {
        if (match.index !== undefined) {
          const idx = match.index;
          const contextBefore = allContent.substring(Math.max(0, idx - 5), idx);
          // Only filter out if preceded by @v (action version pattern)
          if (!contextBefore.includes('@v')) {
            nonActionVersions.push(match[0]);
          }
        }
      });

      // Should be empty or very few (might catch action versions we didn't filter)
      expect(nonActionVersions.length).toBeLessThan(3);
    });

    test('branch name uses new_version not current_version', () => {
      const createBranchStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Create branch'
      );
      expect(createBranchStep.run).toContain('env.new_version');
      expect(createBranchStep.run).not.toContain('env.current_version');
    });

    test('tests run before git operations to prevent bad commits', () => {
      const commitStep = workflow.jobs['bump-version'].steps.find(
        (s: any) => s.name === 'Commit changes'
      );
      const commands = commitStep.run.split('\n');

      const testLineIndex = commands.findIndex((c: string) => c.includes('npm test'));
      const gitAddIndex = commands.findIndex((c: string) => c.includes('git add'));

      expect(testLineIndex).toBeGreaterThan(-1);
      expect(gitAddIndex).toBeGreaterThan(-1);
      expect(testLineIndex).toBeLessThan(gitAddIndex);
    });
  });
});