/**
 * dashboard.js — SSE listener + DOM updater
 */

let eventSource = null;
// eslint-disable-next-line no-unused-vars -- used by HTML inline onclick
let _modalCurrentId = null;
let cells = {}; // id → element

// ── Init ──────────────────────────────────────────────────
async function init() {
  const res = await fetch('/dashboard/api/cells');
  const data = await res.json();
  renderGrid(data);
  connectSSE();
}

function renderGrid(agents) {
  const grid = document.getElementById('dashGrid');
  grid.innerHTML = '';
  cells = {};
  agents.forEach(agent => {
    const el = createCellEl(agent);
    grid.appendChild(el);
    cells[agent.id] = el;
  });
}

function createCellEl(agent) {
  const card = document.createElement('div');
  card.className = 'cell-card loading' + (agent.result?.placeholder ? ' placeholder' : '');
  card.dataset.id = agent.id;
  card.dataset.category = agent.category;
  card.onclick = () => openModal(agent.id);
  card.innerHTML = `
    <div class="cell-header">
      <span class="cell-icon">${agent.icon}</span>
      <span class="cell-name">${agent.name}</span>
      <span class="cell-cat-badge">${agent.category}</span>
    </div>
    <div class="cell-value">—</div>
    <div class="cell-sub">—</div>
    <div class="cell-footer">
      <span class="cell-updated">—</span>
      <span class="cell-dot"></span>
    </div>`;
  return card;
}

// ── SSE ───────────────────────────────────────────────────
function connectSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/dashboard/api/events');
  eventSource.onopen = () => setConnStatus('connected', '✓ 已连接');
  eventSource.onerror = () => {
    setConnStatus('error', '✕ 重连中');
    setTimeout(connectSSE, 3000);
  };
  eventSource.addEventListener('init', e => {
    JSON.parse(e.data).forEach(updateCell);
    document.querySelectorAll('.cell-card.loading').forEach(el => el.classList.remove('loading'));
  });
  eventSource.addEventListener('cell-update', e => {
    const agent = JSON.parse(e.data);
    updateCell(agent);
    const el = document.querySelector(`.cell-card[data-id="${agent.id}"]`);
    if (el) el.classList.remove('loading');
  });
}

function setConnStatus(cls, text) {
  const badge = document.getElementById('connStatus');
  badge.className = 'conn-badge conn-' + cls;
  badge.textContent = text;
}

// ── Cell update ────────────────────────────────────────────
function updateCell(agent) {
  const card = cells[agent.id];
  if (!card) return;
  card.dataset.category = agent.category;
  card.querySelector('.cell-icon').textContent = agent.icon;
  card.querySelector('.cell-name').textContent = agent.name;
  card.querySelector('.cell-cat-badge').textContent = agent.category;
  if (agent.result) {
    card.querySelector('.cell-value').textContent = agent.result.value || '—';
    const subEl = card.querySelector('.cell-sub');
    subEl.textContent = agent.result.sub || '';
    subEl.style.display = agent.result.sub ? '-webkit-box' : 'none';
    card.querySelector('.cell-value').style.color = agent.result.error ? '#ef4444' : '';
  }
  const updated = card.querySelector('.cell-updated');
  const dot = card.querySelector('.cell-dot');
  if (agent.lastRun) {
    updated.textContent = timeAgo(new Date(agent.lastRun)) + '前更新';
    dot.classList.add('live');
  } else {
    updated.textContent = '等待首次更新';
    dot.classList.remove('live');
  }
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 10) return '几秒';
  if (s < 60) return s + '秒';
  if (s < 3600) return Math.floor(s / 60) + '分';
  return Math.floor(s / 3600) + '时';
}

// ── Modal ──────────────────────────────────────────────────
function openModal(id) {
  const agent = getAgentStateSync(id);
  if (!agent) return;
  _modalCurrentId = id;
  document.getElementById('modalIcon').textContent = agent.icon;
  document.getElementById('modalName').textContent = agent.name + ' · ' + agent.category;
  document.getElementById('modalValue').textContent = agent.result?.value || '—';
  document.getElementById('modalMeta').textContent = agent.lastRun
    ? `最后更新: ${new Date(agent.lastRun).toLocaleString('zh-CN')}`
    : '尚未更新';
  const detail = document.getElementById('modalDetail');
  if (agent.result?.detail) {
    detail.textContent = agent.result.detail;
    detail.classList.add('has-detail');
  } else {
    detail.classList.remove('has-detail');
  }
  document.getElementById('cellModal').classList.add('open');
}

function closeModal() {
  document.getElementById('cellModal').classList.remove('open');
  _modalCurrentId = null;
}

document.getElementById('cellModal').addEventListener('click', e => {
  if (e.target.id === 'cellModal') closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Admin actions (called from HTML inline onclick) ─────────
/* eslint-disable no-unused-vars */
async function refreshAll() {
  const badge = document.getElementById('connStatus');
  badge.textContent = '⏳ 刷新中';
  badge.className = 'conn-badge conn-connecting';
  document.querySelectorAll('.cell-card').forEach(el => el.classList.add('loading'));
  await fetch('/dashboard/api/admin/refresh-all', { method: 'POST' });
}

async function refreshCell(id) {
  const el = cells[id];
  if (el) el.classList.add('loading');
  await fetch(`/dashboard/api/admin/refresh/${id}`, { method: 'POST' });
}
/* eslint-enable no-unused-vars */

// ── Helper ─────────────────────────────────────────────────
let _agentsCache = [];

function getAgentStateSync(id) {
  return _agentsCache.find(a => a.id === id);
}

async function refreshAgentsCache() {
  const res = await fetch('/dashboard/api/cells');
  _agentsCache = await res.json();
}

window.addEventListener('DOMContentLoaded', async () => {
  await refreshAgentsCache();
  await init();
});
