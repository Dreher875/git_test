const canvas = document.getElementById('sceneCanvas');
const ctx = canvas.getContext('2d');

const toolButtons = [...document.querySelectorAll('.tool')];
const statusEl = document.getElementById('status');
const evidenceIdInput = document.getElementById('evidenceId');
const evidenceNotesInput = document.getElementById('evidenceNotes');

const state = {
  tool: 'select',
  walls: [],
  evidence: [],
  measurements: [],
  startPoint: null,
  selectedEvidenceIndex: -1,
};

function setTool(tool) {
  state.tool = tool;
  state.startPoint = null;
  toolButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tool === tool));
  statusEl.textContent = `Tool: ${tool[0].toUpperCase()}${tool.slice(1)}`;
}

toolButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * canvas.width) / rect.width,
    y: ((event.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Walls
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0f172a';
  state.walls.forEach((line) => {
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  });

  // Measurements
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#0284c7';
  ctx.fillStyle = '#0369a1';
  ctx.font = '14px sans-serif';
  state.measurements.forEach((m) => {
    ctx.beginPath();
    ctx.moveTo(m.x1, m.y1);
    ctx.lineTo(m.x2, m.y2);
    ctx.stroke();
    const midX = (m.x1 + m.x2) / 2;
    const midY = (m.y1 + m.y2) / 2;
    ctx.fillText(`${m.distance.toFixed(1)} px`, midX + 8, midY - 8);
  });

  // Evidence markers
  state.evidence.forEach((item, i) => {
    const selected = i === state.selectedEvidenceIndex;
    ctx.beginPath();
    ctx.arc(item.x, item.y, selected ? 12 : 10, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#dc2626' : '#ef4444';
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.font = '13px sans-serif';
    ctx.fillText(item.id || `E-${String(i + 1).padStart(2, '0')}`, item.x + 12, item.y - 12);
  });
}

function addSegment(list, p1, p2, extra = {}) {
  list.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...extra });
  draw();
}

function evidenceAt(x, y) {
  return state.evidence.findIndex((e) => Math.hypot(e.x - x, e.y - y) <= 12);
}

canvas.addEventListener('click', (event) => {
  const p = getMousePos(event);

  if (state.tool === 'evidence') {
    state.evidence.push({ x: p.x, y: p.y, id: `E-${String(state.evidence.length + 1).padStart(2, '0')}`, notes: '' });
    state.selectedEvidenceIndex = state.evidence.length - 1;
    const selected = state.evidence[state.selectedEvidenceIndex];
    evidenceIdInput.value = selected.id;
    evidenceNotesInput.value = selected.notes;
    draw();
    return;
  }

  if (state.tool === 'select') {
    state.selectedEvidenceIndex = evidenceAt(p.x, p.y);
    if (state.selectedEvidenceIndex >= 0) {
      const selected = state.evidence[state.selectedEvidenceIndex];
      evidenceIdInput.value = selected.id;
      evidenceNotesInput.value = selected.notes;
      statusEl.textContent = `Selected ${selected.id}`;
    } else {
      evidenceIdInput.value = '';
      evidenceNotesInput.value = '';
      statusEl.textContent = 'No evidence selected';
    }
    draw();
    return;
  }

  if (state.tool === 'wall' || state.tool === 'measure') {
    if (!state.startPoint) {
      state.startPoint = p;
      statusEl.textContent = `Tool: ${state.tool} (pick end point)`;
      return;
    }

    if (state.tool === 'wall') {
      addSegment(state.walls, state.startPoint, p);
    } else {
      const d = Math.hypot(p.x - state.startPoint.x, p.y - state.startPoint.y);
      addSegment(state.measurements, state.startPoint, p, { distance: d });
    }

    state.startPoint = null;
    statusEl.textContent = `Tool: ${state.tool[0].toUpperCase()}${state.tool.slice(1)}`;
  }
});

document.getElementById('saveEvidence').addEventListener('click', () => {
  if (state.selectedEvidenceIndex < 0) {
    statusEl.textContent = 'Select an evidence marker first.';
    return;
  }

  const selected = state.evidence[state.selectedEvidenceIndex];
  selected.id = evidenceIdInput.value.trim() || selected.id;
  selected.notes = evidenceNotesInput.value.trim();
  statusEl.textContent = `Saved ${selected.id}`;
  draw();
});

function downloadFile(name, dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.click();
}

document.getElementById('exportPng').addEventListener('click', () => {
  draw();
  downloadFile('evidence-tech-scene.png', canvas.toDataURL('image/png'));
});

document.getElementById('exportJson').addEventListener('click', () => {
  const payload = {
    caseNumber: document.getElementById('caseNumber').value,
    sceneName: document.getElementById('sceneName').value,
    exportedAt: new Date().toISOString(),
    walls: state.walls,
    measurements: state.measurements,
    evidence: state.evidence,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadFile('evidence-tech-scene.json', url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById('clearScene').addEventListener('click', () => {
  state.walls = [];
  state.evidence = [];
  state.measurements = [];
  state.startPoint = null;
  state.selectedEvidenceIndex = -1;
  evidenceIdInput.value = '';
  evidenceNotesInput.value = '';
  statusEl.textContent = 'Scene cleared';
  draw();
});

draw();
