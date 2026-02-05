#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function run(cmd, cwd = ROOT) {
  console.log(`\n>>> ${cmd}\n`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

console.log('=== Lumen AI Full Build ===\n');

// Step 1: Build backend
console.log('--- Step 1: Build backend ---');
run('bash scripts/build-backend.sh');

// Step 2: Build frontend
console.log('\n--- Step 2: Build frontend ---');
run('bash scripts/build-frontend.sh');

// Step 3: Install Electron deps
console.log('\n--- Step 3: Install Electron deps ---');
run('npm install', path.join(ROOT, 'electron'));

console.log('\n=== Build complete! ===');
console.log('Run "npm run package:mac" or "npm run package:win" to create an installer.');
