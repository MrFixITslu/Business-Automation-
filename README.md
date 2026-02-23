# Business Automation Suite (Desktop)

A cross-platform desktop app (Windows, Linux, macOS) for business operations automation with:

- **Inventory Control** (real-time usage + reorder alerts)
- **Smart Dashboards** (auto-refresh KPI panels)
- **Staff Attendance** (payroll-ready attendance summaries)
- **Work Order Tracking** (lead-to-delivery visibility)
- **Custom Workflows** (examples of bespoke automation paths)
- **Local Expertise** section for direct support details
- **Secure update button** that checks latest GitHub release over HTTPS and opens the release page

## Run locally

```bash
python3 app.py
```

## Configure update source

In `app.py`, set:

```python
GITHUB_REPO = "your-org/business-automation-suite"
```

The update check calls GitHub Releases API securely via HTTPS:

- `https://api.github.com/repos/<owner>/<repo>/releases/latest`

## Build installable app on each OS

Install PyInstaller:

```bash
python3 -m pip install pyinstaller
```

### Windows

```bash
pyinstaller --name BusinessAutomationSuite --windowed --onefile app.py
```

### macOS

```bash
pyinstaller --name BusinessAutomationSuite --windowed --onefile app.py
```

### Linux

```bash
pyinstaller --name business-automation-suite --windowed --onefile app.py
```

Binaries are created in `dist/`.

> Tip: Build on each target platform natively for best compatibility.

## Release and update flow

1. Build a new binary for each platform.
2. Create a GitHub Release with a version tag (e.g. `v1.1.0`).
3. Attach binaries/installers to the release.
4. Users click **Check for Updates** in the app.
5. If a newer tag exists, the app offers to open the secure GitHub release page.
