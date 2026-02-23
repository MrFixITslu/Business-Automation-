# Business Automation Suite v3.1

Cross-platform desktop app for Windows, macOS, and Linux with modular feature enablement and live file-connected dashboards.

## v3.1 functionality

- **Feature selection in Settings**
  - Users can enable only the features they want now
  - Features can be enabled later from Settings
- **Inventory Control**
  - Add/delete inventory items
  - Real-time stock movement simulation
  - Automatic low-stock/reorder alerts
- **Smart Dashboards**
  - KPI chart based on module + connected file status
  - Live file summary cards with refresh timestamps
- **Staff Attendance**
  - Add and remove attendance entries
- **Work Order Tracking**
  - Add and remove work orders across delivery stages
- **Custom Workflows**
  - Add and remove workflow automation definitions
- **System Health**
  - Aggregate cards showing operational state
- **Connected file ingestion + real-time updates**
  - Connect data files from Settings
  - Real-time dashboard refresh when watched files change
  - Supported file types:
    - Spreadsheets: `csv`, `tsv`, `json`, `xls`, `xlsx`, `ods`
    - Documents: `pdf` (parsed as text lines)
- **Secure Updater**
  - Check/download update buttons in app
  - Open latest GitHub release button
  - HTTPS + GitHub host allowlist enforcement in main process

> The Local Expertise section remains removed.

## Development

```bash
npm install
npm start
```

## Build installers

```bash
npm run dist
```

Build outputs:
- Windows: NSIS installer
- macOS: DMG
- Linux: AppImage and DEB

## Configure secure GitHub updates

1. In `package.json`, set:
   - `build.publish[0].owner`
   - `build.publish[0].repo`
2. Publish signed GitHub releases.
3. Optional runtime override with `UPDATE_FEED_URL` (accepted only for HTTPS GitHub hosts).
