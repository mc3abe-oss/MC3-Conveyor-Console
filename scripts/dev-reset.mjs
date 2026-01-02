#!/usr/bin/env node
/**
 * dev-reset.mjs - Nuclear option for stuck dev server
 *
 * Kills ports 3000-3002, removes .next cache, and starts dev server
 * with polling watchers for maximum compatibility (mac + WSL).
 */

import { spawn, execSync } from 'child_process';
import { rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Colors for console output
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

console.log(yellow('\n🔄 Dev Reset - Recovering from stuck state...\n'));

// Step 1: Kill ports 3000, 3001, 3002
const ports = [3000, 3001, 3002];
console.log(dim('Step 1: Killing dev server ports...'));

for (const port of ports) {
  try {
    // Use kill-port via npx (cross-platform)
    execSync(`npx kill-port ${port}`, {
      stdio: 'ignore',
      cwd: projectRoot
    });
    console.log(`  ${green('✓')} Port ${port} cleared`);
  } catch {
    // Port wasn't in use - that's fine
    console.log(`  ${dim(`  Port ${port} not in use`)}`);
  }
}

// Step 2: Remove .next folder
console.log(dim('\nStep 2: Clearing Next.js cache...'));
const nextDir = join(projectRoot, '.next');

if (existsSync(nextDir)) {
  try {
    rmSync(nextDir, { recursive: true, force: true });
    console.log(`  ${green('✓')} Removed .next folder`);
  } catch (err) {
    console.log(`  ${red('✗')} Failed to remove .next: ${err.message}`);
  }
} else {
  console.log(`  ${dim('  .next folder not present')}`);
}

// Step 3: Start dev server with polling watchers
console.log(dim('\nStep 3: Starting dev server with polling watchers...\n'));

const env = {
  ...process.env,
  WATCHPACK_POLLING: 'true',
  CHOKIDAR_USEPOLLING: '1',
};

const devServer = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

devServer.on('error', (err) => {
  console.error(red(`\n✗ Failed to start dev server: ${err.message}`));
  process.exit(1);
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log(yellow('\n\nShutting down dev server...'));
  devServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  devServer.kill('SIGTERM');
  process.exit(0);
});
