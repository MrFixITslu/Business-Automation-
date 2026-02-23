const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

const ALLOWED_UPDATE_HOSTS = new Set(['github.com', 'api.github.com', 'objects.githubusercontent.com']);

function isSecureUpdateFeed(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_UPDATE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

function wireUpdaterEvents() {
  autoUpdater.on('checking-for-update', () => {
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('update-status', 'Checking for updates...'));
  });

  autoUpdater.on('update-available', (info) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send('update-status', `Update available: v${info.version}. Downloading on request...`)
    );
  });

  autoUpdater.on('update-not-available', () => {
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('update-status', 'You are on the latest version.'));
  });

  autoUpdater.on('error', (err) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send('update-status', `Update error: ${err?.message || 'Unknown error'}`)
    );
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent || 0);
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('update-status', `Downloading update... ${pct}%`));
  });

  autoUpdater.on('update-downloaded', (info) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send('update-status', `Update v${info.version} ready. Restart app to install.`)
    );
  });
}

app.whenReady().then(() => {
  wireUpdaterEvents();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('check-for-updates', async () => {
  const updateFeedOverride = process.env.UPDATE_FEED_URL;

  if (updateFeedOverride) {
    if (!isSecureUpdateFeed(updateFeedOverride)) {
      const message = `Blocked non-secure update feed: ${updateFeedOverride}`;
      log.error(message);
      return { ok: false, message };
    }

    autoUpdater.setFeedURL({ provider: 'generic', url: updateFeedOverride });
  }

  try {
    await autoUpdater.checkForUpdates();
    return { ok: true, message: 'Update check started.' };
  } catch (error) {
    const message = error?.message || 'Update check failed.';
    log.error(message);
    return { ok: false, message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true, message: 'Downloading update...' };
  } catch (error) {
    return { ok: false, message: error?.message || 'Unable to download update.' };
  }
});

ipcMain.handle('open-url', async (_evt, url) => {
  if (!isSecureUpdateFeed(url)) {
    return { ok: false, message: 'Only secure GitHub HTTPS links are allowed.' };
  }

  await shell.openExternal(url);
  return { ok: true };
});
