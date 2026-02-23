const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

const ALLOWED_UPDATE_HOSTS = new Set(['github.com', 'api.github.com', 'objects.githubusercontent.com']);
const watchers = new Map();

function isSecureUpdateFeed(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_UPDATE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}


function ensurePackagedForAutoUpdate() {
  if (app.isPackaged) return { ok: true };
  return {
    ok: false,
    message: 'Auto-update is only available in packaged builds (NSIS/DMG/AppImage/DEB), not in development mode.'
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1080,
    minHeight: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

function sendToAll(channel, payload) {
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(channel, payload));
}

function wireUpdaterEvents() {
  autoUpdater.on('checking-for-update', () => sendToAll('update-status', 'Checking for updates...'));

  autoUpdater.on('update-available', (info) => {
    sendToAll('update-status', `Update available: v${info.version}. Downloading on request...`);
  });

  autoUpdater.on('update-not-available', () => sendToAll('update-status', 'You are on the latest version.'));

  autoUpdater.on('error', (err) => {
    sendToAll('update-status', `Update error: ${err?.message || 'Unknown error'}`);
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent || 0);
    sendToAll('update-status', `Downloading update... ${pct}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToAll('update-status', `Update v${info.version} ready. Restart app to install.`);
  });
}

function parseDelimited(text, delimiter = ',') {
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return [];

  const headers = lines[0].split(delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    return row;
  });
}

function normalizeRows(filePath, rows) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    source: filePath,
    ext,
    updatedAt: new Date().toISOString(),
    rows,
    rowCount: rows.length
  };
}

async function parseSpreadsheetOrPdf(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf8');
    return normalizeRows(filePath, parseDelimited(content, ','));
  }

  if (ext === '.tsv') {
    const content = fs.readFileSync(filePath, 'utf8');
    return normalizeRows(filePath, parseDelimited(content, '\t'));
  }

  if (ext === '.json') {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return normalizeRows(filePath, rows);
  }

  if (ext === '.xlsx' || ext === '.xls' || ext === '.ods') {
    let XLSX;
    try {
      XLSX = require('xlsx');
    } catch {
      throw new Error('Excel support requires the optional "xlsx" dependency.');
    }

    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
    return normalizeRows(filePath, rows);
  }

  if (ext === '.pdf') {
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch {
      throw new Error('PDF support requires the optional "pdf-parse" dependency.');
    }

    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    const lines = parsed.text
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 250)
      .map((line, idx) => ({ line: idx + 1, text: line }));

    return normalizeRows(filePath, lines);
  }

  throw new Error(`Unsupported file type: ${ext || 'unknown'}`);
}

async function publishParsedFile(filePath) {
  try {
    const payload = await parseSpreadsheetOrPdf(filePath);
    sendToAll('file-data-updated', { ok: true, payload });
  } catch (error) {
    sendToAll('file-data-updated', {
      ok: false,
      payload: { source: filePath, error: error.message }
    });
  }
}

function watchFile(filePath) {
  if (watchers.has(filePath)) return;

  const watcher = fs.watch(filePath, { persistent: true }, async (eventType) => {
    if (eventType === 'change' || eventType === 'rename') {
      await publishParsedFile(filePath);
    }
  });

  watchers.set(filePath, watcher);
}

function unwatchFile(filePath) {
  const watcher = watchers.get(filePath);
  if (!watcher) return;
  watcher.close();
  watchers.delete(filePath);
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

app.on('before-quit', () => {
  watchers.forEach((watcher) => watcher.close());
  watchers.clear();
});

ipcMain.handle('check-for-updates', async () => {
  const packagedCheck = ensurePackagedForAutoUpdate();
  if (!packagedCheck.ok) return packagedCheck;
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
  const packagedCheck = ensurePackagedForAutoUpdate();
  if (!packagedCheck.ok) return packagedCheck;
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

ipcMain.handle('select-data-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Spreadsheets and PDF',
        extensions: ['csv', 'tsv', 'json', 'xls', 'xlsx', 'ods', 'pdf']
      }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return { ok: false, message: 'No files selected.', files: [] };
  }

  for (const filePath of result.filePaths) {
    watchFile(filePath);
    await publishParsedFile(filePath);
  }

  return { ok: true, message: 'Files connected.', files: result.filePaths };
});

ipcMain.handle('disconnect-data-file', async (_evt, filePath) => {
  unwatchFile(filePath);
  return { ok: true };
});
