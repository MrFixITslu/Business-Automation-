const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('automationApp', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  selectDataFiles: () => ipcRenderer.invoke('select-data-files'),
  disconnectDataFile: (filePath) => ipcRenderer.invoke('disconnect-data-file', filePath),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_event, status) => cb(status)),
  onFileDataUpdated: (cb) => ipcRenderer.on('file-data-updated', (_event, payload) => cb(payload))
});
