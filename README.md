# Business Automation Suite

A cross-platform desktop app (Windows/macOS/Linux) for operational visibility and automation.

## Included features

- **Inventory Control** with real-time stock movement and reorder alerts.
- **Smart Dashboards** with auto-refreshing visual KPIs.
- **Staff Attendance** feed for payroll-ready check-in status.
- **Work Order Tracking** from lead to delivery.
- **Custom Workflows** panel for automation templates.
- **Local Expertise** onboarding and support section.
- **In-app updater** with buttons to check/download updates and open the secure GitHub release page.

## Development

```bash
npm install
npm start
```

## Build installers for all OS targets

> Build each target from its native OS for best compatibility/signing.

```bash
npm run dist
```

Output artifacts:
- Windows: `NSIS` installer
- macOS: `DMG`
- Linux: `AppImage` and `DEB`

## Secure update source

1. Set `build.publish.owner` and `build.publish.repo` in `package.json` to your private/public secure GitHub repository.
2. Publish signed releases on GitHub.
3. Optionally override feed at runtime with `UPDATE_FEED_URL`, only HTTPS GitHub-hosted URLs are accepted.

