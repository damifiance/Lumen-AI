#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const isWindows = os.platform() === 'win32';

function run(cmd, cwd = ROOT) {
  console.log(`\n>>> ${cmd}\n`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

console.log('=== Lumen AI Full Build ===\n');

// Step 1: Build backend
console.log('--- Step 1: Build backend ---');
if (isWindows) {
  run('scripts\\build-backend.bat');
} else {
  run('bash scripts/build-backend.sh');
}

// Step 2: Build frontend
console.log('\n--- Step 2: Build frontend ---');
if (isWindows) {
  run('scripts\\build-frontend.bat');
} else {
  run('bash scripts/build-frontend.sh');
}

// Step 3: Install Electron deps
console.log('\n--- Step 3: Install Electron deps ---');
run('npm install', path.join(ROOT, 'electron'));

console.log('\n=== Build complete! ===');
console.log('Run "npm run package:mac", "npm run package:win", or "npm run package:linux" to create an installer.');
