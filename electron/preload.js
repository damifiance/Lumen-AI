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
  startOAuth: (url) => ipcRenderer.invoke('start-oauth', url),
  onOAuthCallback: (callback) => ipcRenderer.on('oauth-callback', (_event, data) => callback(data)),
  removeOAuthCallback: () => ipcRenderer.removeAllListeners('oauth-callback'),
  onAuthDeepLink: (callback) => ipcRenderer.on('auth-deep-link', (_event, data) => callback(data)),
  removeAuthDeepLink: () => ipcRenderer.removeAllListeners('auth-deep-link'),
  deleteUserAccount: (userId) => ipcRenderer.invoke('delete-user-account', userId),
});
