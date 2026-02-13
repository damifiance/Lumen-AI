const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const { checkForUpdates } = require('./updater');

let tray = null;

function createTray({ onShowWindow, onQuit }) {
  const iconName = process.platform === 'darwin' ? 'trayIcon.png' : 'icon.png';
  const iconPath = path.join(__dirname, 'build', iconName);
  let icon = nativeImage.createFromPath(iconPath);

  // macOS: mark as template image so it adapts to light/dark menu bar
  if (process.platform === 'darwin') {
    icon = icon.resize({ width: 18, height: 18 });
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('Lumen AI');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Lumen AI',
      click: onShowWindow,
    },
    { type: 'separator' },
    {
      label: 'Check for Updates...',
      click: () => checkForUpdates(),
    },
    { type: 'separator' },
    {
      label: 'Quit Lumen AI',
      click: onQuit,
    },
  ]);

  tray.setContextMenu(contextMenu);

  // On Windows/Linux, left-click opens the app
  if (process.platform !== 'darwin') {
    tray.on('click', onShowWindow);
  }

  return tray;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, destroyTray };
