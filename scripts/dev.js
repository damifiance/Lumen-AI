#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

console.log('=== Lumen AI Dev Mode ===\n');
console.log('Starting backend, frontend, and Electron in dev mode...\n');

// Start backend (uvicorn)
const backend = spawn('uvicorn', ['app.main:app', '--reload', '--port', '8000'], {
  cwd: path.join(ROOT, 'backend'),
  stdio: 'inherit',
  shell: true,
});

// Start frontend (vite dev server)
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(ROOT, 'frontend'),
  stdio: 'inherit',
  shell: true,
});

// Wait a moment for vite to start, then launch Electron
setTimeout(() => {
  const electron = spawn('npx', ['electron', '.'], {
    cwd: path.join(ROOT, 'electron'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ELECTRON_DEV: 'true' },
  });

  electron.on('exit', () => {
    console.log('\nElectron closed, shutting down...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
}, 3000);

// Handle cleanup
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
