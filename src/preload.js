const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('automationApp', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_event, status) => cb(status))
});
