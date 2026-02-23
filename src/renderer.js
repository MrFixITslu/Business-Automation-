const STORAGE_KEY = 'business-automation-suite-v3.1';

const FEATURE_DEFS = [
  { key: 'inventory', label: 'Inventory Control' },
  { key: 'dashboard', label: 'Smart Dashboards' },
  { key: 'attendance', label: 'Staff Attendance' },
  { key: 'workOrders', label: 'Work Order Tracking' },
  { key: 'workflows', label: 'Custom Workflows' },
  { key: 'systemHealth', label: 'System Health' }
];

const defaultState = {
  enabledFeatures: FEATURE_DEFS.reduce((acc, f) => ({ ...acc, [f.key]: true }), {}),
  connectedFiles: [],
  fileSnapshots: {},
  inventory: [
    { id: crypto.randomUUID(), item: 'Steel Bolts', stock: 126, reorderAt: 80 },
    { id: crypto.randomUUID(), item: 'Hydraulic Fluid', stock: 40, reorderAt: 45 },
    { id: crypto.randomUUID(), item: 'Packaging Boxes', stock: 210, reorderAt: 100 }
  ],
  attendance: [
    { id: crypto.randomUUID(), staff: 'Alicia', status: 'Checked in 08:01' },
    { id: crypto.randomUUID(), staff: 'Devon', status: 'Checked in 08:05' },
    { id: crypto.randomUUID(), staff: 'Mina', status: 'Approved leave' }
  ],
  workOrders: [
    { id: crypto.randomUUID(), code: 'WO-1024', stage: 'Lead Qualified', owner: 'Alicia' },
    { id: crypto.randomUUID(), code: 'WO-1025', stage: 'In Production', owner: 'Devon' }
  ],
  workflows: [
    { id: crypto.randomUUID(), name: 'Auto-Invoicing', trigger: 'Work order delivered', action: 'Create and email invoice' }
  ]
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    const merged = structuredClone(defaultState);
    return {
      ...merged,
      ...parsed,
      enabledFeatures: { ...merged.enabledFeatures, ...(parsed.enabledFeatures || {}) },
      connectedFiles: Array.isArray(parsed.connectedFiles) ? parsed.connectedFiles : [],
      fileSnapshots: parsed.fileSnapshots || {}
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function removeById(collection, id) {
  state[collection] = state[collection].filter((x) => x.id !== id);
  saveState();
  renderAll();
}

function renderFeatureToggles() {
  const container = document.getElementById('featureToggles');
  container.innerHTML = FEATURE_DEFS.map(
    (f) => `
      <label class="toggle-item">
        <input type="checkbox" data-toggle-feature="${f.key}" ${state.enabledFeatures[f.key] ? 'checked' : ''} />
        <span>${f.label}</span>
      </label>
    `
  ).join('');

  document.querySelectorAll('.feature').forEach((section) => {
    const key = section.getAttribute('data-feature');
    section.style.display = state.enabledFeatures[key] ? 'block' : 'none';
  });
}

function renderConnectedFiles() {
  const list = document.getElementById('connectedFilesList');
  if (!state.connectedFiles.length) {
    list.innerHTML = '<li>No files connected yet.</li>';
    return;
  }

  list.innerHTML = state.connectedFiles
    .map(
      (filePath) => `<li><code>${filePath}</code> <button class="danger" data-disconnect-file="${filePath}">Disconnect</button></li>`
    )
    .join('');
}

function renderFileSummary() {
  const summary = document.getElementById('fileSummary');
  const snapshots = Object.values(state.fileSnapshots);

  if (!snapshots.length) {
    summary.innerHTML = '<p class="muted">No connected file data yet.</p>';
    return;
  }

  summary.innerHTML = snapshots
    .map((snap) => {
      if (snap.error) {
        return `<div class="file-item error"><strong>${snap.source}</strong><div>Error: ${snap.error}</div></div>`;
      }

      return `<div class="file-item"><strong>${snap.source}</strong><div>${snap.rowCount} rows • Updated: ${new Date(
        snap.updatedAt
      ).toLocaleTimeString()}</div></div>`;
    })
    .join('');
}

function renderInventory() {
  const rows = document.getElementById('inventoryRows');
  rows.innerHTML = '';

  for (const row of state.inventory) {
    const status = row.stock <= row.reorderAt ? 'Reorder now' : 'Healthy';
    const klass = row.stock <= row.reorderAt ? 'status-warn' : 'status-ok';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.item}</td>
      <td>${row.stock}</td>
      <td>${row.reorderAt}</td>
      <td class="${klass}">${status}</td>
      <td><button class="danger" data-delete="inventory" data-id="${row.id}">Delete</button></td>
    `;
    rows.appendChild(tr);
  }
}

function renderAttendance() {
  const list = document.getElementById('attendanceList');
  list.innerHTML = state.attendance
    .map(
      (x) =>
        `<li><strong>${x.staff}:</strong> ${x.status} <button class="danger" data-delete="attendance" data-id="${x.id}">Delete</button></li>`
    )
    .join('');
}

function renderWorkOrders() {
  const list = document.getElementById('workOrderList');
  list.innerHTML = state.workOrders
    .map(
      (w) =>
        `<li><strong>${w.code}</strong> — ${w.stage} <em>(Owner: ${w.owner})</em> <button class="danger" data-delete="workOrders" data-id="${w.id}">Delete</button></li>`
    )
    .join('');
}

function renderWorkflows() {
  const list = document.getElementById('workflowList');
  list.innerHTML = state.workflows
    .map(
      (w) => `
      <div class="workflow-item">
        <strong>${w.name}</strong>
        <div>Trigger: ${w.trigger}</div>
        <div>Action: ${w.action}</div>
        <button class="danger" data-delete="workflows" data-id="${w.id}">Delete</button>
      </div>`
    )
    .join('');
}

function buildKpis() {
  const totalStock = state.inventory.reduce((acc, item) => acc + item.stock, 0);
  const atRisk = state.inventory.filter((x) => x.stock <= x.reorderAt).length;
  const present = state.attendance.filter((x) => !x.status.toLowerCase().includes('leave')).length;
  const delivered = state.workOrders.filter((x) => x.stage === 'Delivered').length;
  const connectedRows = Object.values(state.fileSnapshots)
    .filter((s) => !s.error)
    .reduce((acc, s) => acc + (s.rowCount || 0), 0);

  return [
    { label: 'Total Stock', value: Math.min(100, Math.round(totalStock / 5)) },
    { label: 'Inventory Risk', value: Math.min(100, atRisk * 25) },
    { label: 'Attendance', value: Math.min(100, present * 20) },
    { label: 'Data Freshness', value: Math.min(100, connectedRows > 0 ? 100 : 0) }
  ];
}

function drawChart() {
  const kpis = buildKpis();
  const canvas = document.getElementById('kpiChart');
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = 90;
  const gap = 25;

  kpis.forEach((kpi, idx) => {
    const x = 20 + idx * (barWidth + gap);
    const h = (kpi.value / 100) * 150;
    const y = 180 - h;

    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(x, y, barWidth, h);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${kpi.label}`, x, 200);
    ctx.fillText(`${kpi.value}%`, x + 22, y - 8);
  });
}

function renderHealth() {
  const totalInventoryItems = state.inventory.length;
  const inventoryAlerts = state.inventory.filter((x) => x.stock <= x.reorderAt).length;
  const activeWorkOrders = state.workOrders.filter((x) => x.stage !== 'Delivered').length;
  const automationCount = state.workflows.length;

  const stats = [
    { label: 'Inventory Items', value: totalInventoryItems },
    { label: 'Low Stock Alerts', value: inventoryAlerts },
    { label: 'Active Work Orders', value: activeWorkOrders },
    { label: 'Active Workflows', value: automationCount }
  ];

  document.getElementById('healthStats').innerHTML = stats
    .map((x) => `<div class="stat"><strong>${x.value}</strong><span>${x.label}</span></div>`)
    .join('');
}

function renderAll() {
  renderFeatureToggles();
  renderConnectedFiles();
  renderFileSummary();
  renderInventory();
  renderAttendance();
  renderWorkOrders();
  renderWorkflows();
  renderHealth();
  drawChart();
}

function wireForms() {
  document.getElementById('inventoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const item = document.getElementById('invItem').value.trim();
    const stock = Number(document.getElementById('invStock').value);
    const reorderAt = Number(document.getElementById('invReorder').value);
    state.inventory.push({ id: crypto.randomUUID(), item, stock, reorderAt });
    e.target.reset();
    saveState();
    renderAll();
  });

  document.getElementById('attendanceForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const staff = document.getElementById('attStaff').value.trim();
    const baseStatus = document.getElementById('attStatus').value;
    const status = baseStatus === 'Approved leave' ? baseStatus : `${baseStatus} ${new Date().toLocaleTimeString()}`;
    state.attendance.push({ id: crypto.randomUUID(), staff, status });
    e.target.reset();
    saveState();
    renderAll();
  });

  document.getElementById('workOrderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('woId').value.trim();
    const stage = document.getElementById('woStage').value;
    const owner = document.getElementById('woOwner').value.trim();
    state.workOrders.push({ id: crypto.randomUUID(), code, stage, owner });
    e.target.reset();
    saveState();
    renderAll();
  });

  document.getElementById('workflowForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('wfName').value.trim();
    const trigger = document.getElementById('wfTrigger').value.trim();
    const action = document.getElementById('wfAction').value.trim();
    state.workflows.push({ id: crypto.randomUUID(), name, trigger, action });
    e.target.reset();
    saveState();
    renderAll();
  });

  document.body.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      removeById(deleteBtn.getAttribute('data-delete'), deleteBtn.getAttribute('data-id'));
      return;
    }

    const toggle = e.target.closest('[data-toggle-feature]');
    if (toggle) {
      const key = toggle.getAttribute('data-toggle-feature');
      state.enabledFeatures[key] = toggle.checked;
      saveState();
      renderAll();
      return;
    }

    const disconnectBtn = e.target.closest('[data-disconnect-file]');
    if (disconnectBtn) {
      const filePath = disconnectBtn.getAttribute('data-disconnect-file');
      state.connectedFiles = state.connectedFiles.filter((x) => x !== filePath);
      delete state.fileSnapshots[filePath];
      await window.automationApp.disconnectDataFile(filePath);
      saveState();
      renderAll();
    }
  });
}

function tickRealtimeInventory() {
  state.inventory.forEach((item) => {
    const variance = Math.floor(Math.random() * 7) - 3;
    item.stock = Math.max(0, item.stock + variance);
  });
  saveState();
  renderAll();
}

function wireFileConnect() {
  const btn = document.getElementById('connectFilesBtn');

  btn.addEventListener('click', async () => {
    const res = await window.automationApp.selectDataFiles();
    if (!res.ok) return;

    for (const filePath of res.files) {
      if (!state.connectedFiles.includes(filePath)) state.connectedFiles.push(filePath);
    }

    saveState();
    renderAll();
  });

  window.automationApp.onFileDataUpdated((message) => {
    if (!message || !message.payload) return;
    const payload = message.payload;
    state.fileSnapshots[payload.source] = payload;
    if (!state.connectedFiles.includes(payload.source)) state.connectedFiles.push(payload.source);
    saveState();
    renderAll();
  });
}

function wireUpdateButtons() {
  const status = document.getElementById('updateStatus');
  const checkBtn = document.getElementById('checkUpdateBtn');
  const downloadBtn = document.getElementById('downloadUpdateBtn');
  const releaseBtn = document.getElementById('releaseBtn');

  checkBtn.addEventListener('click', async () => {
    const res = await window.automationApp.checkForUpdates();
    status.textContent = `Status: ${res.message}`;
  });

  downloadBtn.addEventListener('click', async () => {
    const res = await window.automationApp.downloadUpdate();
    status.textContent = `Status: ${res.message}`;
  });

  releaseBtn.addEventListener('click', async () => {
    const res = await window.automationApp.openUrl('https://github.com/YOUR_GITHUB_ORG/YOUR_SECURE_REPO/releases/latest');
    if (!res.ok) status.textContent = `Status: ${res.message}`;
  });

  window.automationApp.onUpdateStatus((txt) => {
    status.textContent = `Status: ${txt}`;
  });
}

renderAll();
wireForms();
wireFileConnect();
wireUpdateButtons();

setInterval(tickRealtimeInventory, 5000);
