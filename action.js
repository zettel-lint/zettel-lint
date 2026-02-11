import { getInput, setOutput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';

async function run() {
  try {
    // Get action inputs
    const path = getInput('path') || '.';
    const force = getInput('force') === 'true';
    const format = getInput('format') || 'text';
    const verbose = getInput('verbose') === 'true';

    // Build zettel-lint command
    let command = 'npx zettel-lint';
    const args = [path];

    if (force) {
      args.push('--force');
    }

    if (verbose) {
      args.push('--verbose');
    }

    // Add format-specific arguments
    switch (format) {
      case 'json':
        args.push('--format', 'json', '--output', 'zettel-lint-report.json');
        break;
      case 'html':
        args.push('--format', 'html', '--output', 'zettel-lint-report.html');
        break;
      case 'text':
      default:
        // Default text output
        break;
    }

    console.log(`Running: ${command} ${args.join(' ')}`);

    // Execute zettel-lint
    let output = '';
    let exitCode = 0;
    
    try {
      exitCode = await exec(command, args, {
        listeners: {
          stdout: (data) => {
            output += data.toString();
          },
          stderr: (data) => {
            output += data.toString();
          }
        }
      });
    } catch (error) {
      exitCode = error.code || 1;
    }

    // Parse output and set results
    const result = exitCode === 0 ? 'success' : exitCode === 1 ? 'warning' : 'error';
    setOutput('result', result);
    setOutput('summary', output.substring(0, 1000)); // Truncate to 1000 chars

    // Set report file path if generated
    if (format === 'json') {
      setOutput('file', 'zettel-lint-report.json');
    } else if (format === 'html') {
      setOutput('file', 'zettel-lint-report.html');
    }

    // Print full output to action log
    console.log('\n=== Zettel Lint Output ===\n');
    console.log(output);

    // Fail if exit code indicates error
    if (exitCode !== 0 && exitCode !== 1) {
      setFailed(`Zettel lint failed with exit code ${exitCode}`);
    }

  } catch (error) {
    setFailed(error.message);
  }
}

// Execute the action
run();
