const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  secureStore: {
    get: (key) => ipcRenderer.invoke('secureStore:get', key),
    set: (key, value) => ipcRenderer.invoke('secureStore:set', key, value),
    remove: (key) => ipcRenderer.invoke('secureStore:remove', key),
  },
});
