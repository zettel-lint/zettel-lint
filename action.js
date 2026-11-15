import { getInput, setFailed, setOutput } from '@actions/core';
import { exec } from '@actions/exec';
import { StringDecoder } from 'node:string_decoder';

async function run() {
  try {
    // Get action inputs
    const path = getInput('path') || '.';
    const verbose = getInput('verbose') === 'true';

    // Build zettel-lint command
    const command = 'npx';
    const args = ['zettel-lint', 'index', '--path', path];

    if (verbose) {
      args.push('--verbose');
    }

    console.log(`Running: ${command} ${args.join(' ')}`);

    // Execute zettel-lint
    let output = '';
    let exitCode = 0;
    const stdoutDecoder = new StringDecoder('utf8');
    const stderrDecoder = new StringDecoder('utf8');

    try {
      exitCode = await exec(command, args, {
        ignoreReturnCode: true,
        listeners: {
          stdout: (data) => {
            output += stdoutDecoder.write(data);
          },
          stderr: (data) => {
            output += stderrDecoder.write(data);
          }
        }
      });
    } catch {
      exitCode = 2;
    } finally {
      output += stdoutDecoder.end();
      output += stderrDecoder.end();
    }

    // Parse output and set results
    const result = exitCode === 0 ? 'success' : exitCode === 1 ? 'warning' : 'error';
    setOutput('result', result);
    setOutput('summary', output.substring(0, 1000)); // Truncate to 1000 chars

    // Print full output to action log
    console.log('\n=== Zettel Lint Output ===\n');
    console.log(output);

    // Fail if exit code indicates error
    if (exitCode !== 0 && exitCode !== 1) {
      setFailed(`Zettel lint failed with exit code ${exitCode}`);
    }

  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error));
  }
}

// Execute the action
run();
