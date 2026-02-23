const inventoryData = [
  { item: 'Steel Bolts', stock: 126, reorderAt: 80 },
  { item: 'Hydraulic Fluid', stock: 40, reorderAt: 45 },
  { item: 'Packaging Boxes', stock: 210, reorderAt: 100 },
  { item: 'Safety Gloves', stock: 28, reorderAt: 30 }
];

const attendanceData = [
  { staff: 'Alicia', status: 'Checked in 08:01' },
  { staff: 'Devon', status: 'Checked in 08:05' },
  { staff: 'Jordan', status: 'On-site - Route B' },
  { staff: 'Mina', status: 'Approved leave' }
];

const workOrders = [
  { id: 'WO-1024', stage: 'Lead Qualified', owner: 'Alicia' },
  { id: 'WO-1025', stage: 'In Production', owner: 'Devon' },
  { id: 'WO-1026', stage: 'Quality Check', owner: 'Jordan' },
  { id: 'WO-1027', stage: 'Delivered', owner: 'Mina' }
];

const kpis = [
  { label: 'Revenue', value: 82 },
  { label: 'On-time Delivery', value: 91 },
  { label: 'Labor Utilization', value: 74 },
  { label: 'Inventory Health', value: 65 }
];

function renderInventory() {
  const rows = document.getElementById('inventoryRows');
  rows.innerHTML = '';

  for (const row of inventoryData) {
    const status = row.stock <= row.reorderAt ? 'Reorder now' : 'Healthy';
    const klass = row.stock <= row.reorderAt ? 'status-warn' : 'status-ok';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.item}</td>
      <td>${row.stock}</td>
      <td>${row.reorderAt}</td>
      <td class="${klass}">${status}</td>
    `;
    rows.appendChild(tr);
  }
}

function drawChart() {
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

function renderAttendance() {
  const list = document.getElementById('attendanceList');
  list.innerHTML = attendanceData.map((x) => `<li><strong>${x.staff}:</strong> ${x.status}</li>`).join('');
}

function renderWorkOrders() {
  const list = document.getElementById('workOrderList');
  list.innerHTML = workOrders
    .map((w) => `<li><strong>${w.id}</strong> — ${w.stage} <em>(Owner: ${w.owner})</em></li>`)
    .join('');
}

function tickRealtimeInventory() {
  inventoryData.forEach((item) => {
    const variance = Math.floor(Math.random() * 7) - 3;
    item.stock = Math.max(0, item.stock + variance);
  });
  renderInventory();
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

renderInventory();
renderAttendance();
renderWorkOrders();
drawChart();
wireUpdateButtons();

setInterval(tickRealtimeInventory, 5000);
