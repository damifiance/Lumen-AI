const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const findFreePort = require('find-free-port');
const fs = require('fs');
const { createTray, destroyTray } = require('./tray');
const { checkForUpdates } = require('./updater');
const secureStore = require('./secureStore');

let mainWindow = null;
let backendProcess = null;
let backendPort = null;
let isQuitting = false;

const isDev = process.env.ELECTRON_DEV === 'true';

function getDataDir() {
  const dir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDatabaseUrl() {
  const dbPath = path.join(getDataDir(), 'papers.db');
  return `sqlite+aiosqlite:///${dbPath}`;
}

function getBackendPath() {
  if (isDev) {
    return null; // In dev mode, backend runs separately
  }
  // In production, the backend is bundled alongside the Electron app
  const platformMap = {
    darwin: path.join(process.resourcesPath, 'backend', 'lumen-backend'),
    win32: path.join(process.resourcesPath, 'backend', 'lumen-backend.exe'),
    linux: path.join(process.resourcesPath, 'backend', 'lumen-backend'),
  };
  return platformMap[process.platform];
}

async function startBackend(port) {
  const backendPath = getBackendPath();

  if (isDev) {
    // In dev mode, assume backend is already running or start via uvicorn
    console.log(`Dev mode: expecting backend on port ${port}`);
    return null;
  }

  console.log(`Starting backend: ${backendPath} on port ${port}`);

  const env = {
    ...process.env,
    DATABASE_URL: getDatabaseUrl(),
    PAPERS_ROOT: app.getPath('home'),
  };

  const child = spawn(backendPath, ['--port', String(port)], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  child.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  child.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    if (code !== 0 && code !== null) {
      app.quit();
    }
  });

  return child;
}

function waitForBackend(port, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function check() {
      attempts++;
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          reject(new Error('Backend did not become healthy'));
        }
      });
      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          reject(new Error('Backend did not start'));
        }
      });
      req.end();
    }

    check();
  });
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Lumen AI',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(process.resourcesPath, 'frontend', 'dist', 'index.html'));
  }

  // Close to tray instead of quitting
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const [port] = await findFreePort(8100, '127.0.0.1');
    backendPort = port;

    ipcMain.handle('get-backend-port', () => backendPort);

    // In-app update check
    ipcMain.handle('check-for-updates', async () => {
      return checkForUpdates({ parentWindow: mainWindow });
    });

    // Get current app version
    ipcMain.handle('get-app-version', () => app.getVersion());

    // Secure storage IPC handlers
    ipcMain.handle('secureStore:set', async (_event, key, value) => {
      secureStore.set(key, value);
    });
    ipcMain.handle('secureStore:get', async (_event, key) => {
      return secureStore.get(key);
    });
    ipcMain.handle('secureStore:remove', async (_event, key) => {
      secureStore.remove(key);
    });

    if (!isDev) {
      backendProcess = await startBackend(port);
      console.log(`Waiting for backend on port ${port}...`);
      await waitForBackend(port);
      console.log('Backend is ready');
    } else {
      // In dev mode, use port 8000 (default uvicorn)
      backendPort = 8000;
    }

    createWindow();

    // Create system tray
    createTray({
      onShowWindow: showWindow,
      onQuit: () => {
        isQuitting = true;
        app.quit();
      },
    });

    // Silent update check on launch (don't bother user if up to date)
    if (!isDev) {
      setTimeout(() => {
        checkForUpdates({ silent: true, parentWindow: mainWindow }).then((result) => {
          if (result.updateAvailable) {
            console.log(`Update available: v${result.latestVersion}`);
          }
        });
      }, 5000);
    }
  } catch (err) {
    console.error('Failed to start:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Don't quit — app lives in tray
});

app.on('activate', () => {
  showWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
  destroyTray();
  if (backendProcess) {
    console.log('Stopping backend...');
    backendProcess.kill('SIGTERM');
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
});
