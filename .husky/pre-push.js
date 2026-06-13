const { execSync, spawn } = require('child_process');

function getChangedFiles() {
  try {
    // 1. Get current branch name
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    // We want to compare HEAD with the target branch.
    // Usually, in a pre-push hook, we can compare HEAD against its merge base with origin/develop, develop, origin/main, or main.
    let base = '';
    
    // Determine target branches, prioritizing main/master for hotfix or release branches
    let targetBranches = ['origin/develop', 'develop', 'origin/main', 'main'];
    if (currentBranch.startsWith('hotfix/') || currentBranch.startsWith('release/')) {
      targetBranches = ['origin/main', 'main', 'origin/develop', 'develop'];
    }

    // Attempt to find the merge base with target branches
    for (const target of targetBranches) {
      try {
        base = execSync(`git merge-base ${target} HEAD`, { encoding: 'utf8' }).trim();
        if (base) {
          console.log(`[Husky] Found merge base with ${target}: ${base}`);
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }
    
    if (!base) {
      // If no target branches are found, use HEAD~1 as a fallback
      try {
        base = execSync('git rev-parse HEAD~1', { encoding: 'utf8' }).trim();
        console.log(`[Husky] Falling back to comparing with HEAD~1`);
      } catch (e) {
        // If it's the very first commit in the repository
        console.log('[Husky] No previous commits or branches found. Checking all files.');
        return null;
      }
    }

    const diffOutput = execSync(`git diff --name-only ${base} HEAD`, { encoding: 'utf8' });
    return diffOutput.split('\n').map(f => f.trim()).filter(Boolean);
  } catch (error) {
    console.warn('[Husky Warning] Failed to determine changed files. Falling back to checking all files.');
    return null;
  }
}

function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`[Husky] Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { stdio: 'inherit', shell: true, cwd });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const changedFiles = getChangedFiles();
  
  let runBackend = false;
  let runFrontend = false;
  
  if (changedFiles === null) {
    // Fallback: run both
    runBackend = true;
    runFrontend = true;
  } else {
    if (changedFiles.length === 0) {
      console.log('[Husky] No changed files detected.');
    } else {
      console.log(`[Husky] Changed files detected (${changedFiles.length}):`);
      // Print first 10 files
      changedFiles.slice(0, 10).forEach(f => console.log(`  - ${f}`));
      if (changedFiles.length > 10) {
        console.log(`  - ... and ${changedFiles.length - 10} more files`);
      }
    }

    for (const file of changedFiles) {
      if (file.startsWith('backend/')) {
        runBackend = true;
      } else if (file.startsWith('frontend/')) {
        runFrontend = true;
      } else {
        // Any file not in frontend or backend (e.g., package.json, pnpm-lock.yaml, docker-compose, etc.)
        // will trigger checks on both modules for safety.
        console.log(`[Husky] Global/root file change detected: "${file}". Triggering checks for both frontend and backend.`);
        runBackend = true;
        runFrontend = true;
        break;
      }
    }
  }

  try {
    // Run Backend checks
    if (runBackend) {
      console.log('\n========================================');
      console.log('       RUNNING BACKEND CHECKS           ');
      console.log('========================================');
      await runCommand('pnpm', ['lint:be']);
      await runCommand('pnpm', ['build:be']);
    } else {
      console.log('\n----------------------------------------');
      console.log('       Backend skipped                  ');
      console.log('----------------------------------------');
    }

    // Run Frontend checks
    if (runFrontend) {
      console.log('\n========================================');
      console.log('       RUNNING FRONTEND CHECKS          ');
      console.log('========================================');
      await runCommand('pnpm', ['lint:fe']);
      await runCommand('pnpm', ['build:fe']);
    } else {
      console.log('\n----------------------------------------');
      console.log('       Frontend skipped                 ');
      console.log('----------------------------------------');
    }
    
    console.log('\n[Husky] All pre-push checks completed successfully! 🎉\n');
  } catch (error) {
    console.error(`\n❌ [Husky] Pre-push verification failed: ${error.message}\n`);
    process.exit(1);
  }
}

main();
