const canvas = document.getElementById('sceneCanvas');
const ctx = canvas.getContext('2d');

const toolButtons = [...document.querySelectorAll('.tool')];
const statusEl = document.getElementById('status');
const evidenceIdInput = document.getElementById('evidenceId');
const evidenceNotesInput = document.getElementById('evidenceNotes');
const scalePresetSelect = document.getElementById('scalePreset');
const customScaleWrap = document.getElementById('customScaleWrap');
const customScaleValueInput = document.getElementById('customScaleValue');
const customScaleUnitSelect = document.getElementById('customScaleUnit');
const scaleSummaryEl = document.getElementById('scaleSummary');

const GRID_SIZE_PX = 24;

const state = {
  tool: 'select',
  walls: [],
  evidence: [],
  measurements: [],
  startPoint: null,
  previewPoint: null,
  selectedEvidenceIndex: -1,
  scale: {
    value: 1,
    unit: 'ft',
    label: '1 sq = 1 foot',
  },
};

function setTool(tool) {
  state.tool = tool;
  state.startPoint = null;
  state.previewPoint = null;
  toolButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tool === tool));
  statusEl.textContent = `Tool: ${tool[0].toUpperCase()}${tool.slice(1)}`;
  draw();
}

toolButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

function unitLabel(unit, value) {
  if (unit === 'in') {
    return value === 1 ? 'inch' : 'inches';
  }
  return value === 1 ? 'foot' : 'feet';
}

function updateScaleFromInputs() {
  const preset = scalePresetSelect.value;

  if (preset === '6in') {
    state.scale = { value: 6, unit: 'in', label: '1 sq = 6 inches' };
  } else if (preset === '1ft') {
    state.scale = { value: 1, unit: 'ft', label: '1 sq = 1 foot' };
  } else if (preset === '2ft') {
    state.scale = { value: 2, unit: 'ft', label: '1 sq = 2 feet' };
  } else {
    const customValue = Number(customScaleValueInput.value);
    const safeValue = Number.isFinite(customValue) && customValue > 0 ? customValue : 1;
    const customUnit = customScaleUnitSelect.value;
    state.scale = {
      value: safeValue,
      unit: customUnit,
      label: `1 sq = ${safeValue} ${unitLabel(customUnit, safeValue)}`,
    };
  }

  customScaleWrap.classList.toggle('hidden', preset !== 'custom');
  scaleSummaryEl.textContent = `Current: ${state.scale.label}`;
  draw();
}

scalePresetSelect.addEventListener('change', updateScaleFromInputs);
customScaleValueInput.addEventListener('input', updateScaleFromInputs);
customScaleUnitSelect.addEventListener('change', updateScaleFromInputs);

function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * canvas.width) / rect.width,
    y: ((event.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function snapToGrid(point) {
  return {
    x: Math.round(point.x / GRID_SIZE_PX) * GRID_SIZE_PX,
    y: Math.round(point.y / GRID_SIZE_PX) * GRID_SIZE_PX,
  };
}

function formatDistance(pixelDistance) {
  const squares = pixelDistance / GRID_SIZE_PX;
  const converted = squares * state.scale.value;
  const unit = unitLabel(state.scale.unit, Number(converted.toFixed(2)));
  return `${converted.toFixed(2)} ${unit}`;
}

function drawGrid() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e2e8f0';

  for (let x = 0; x <= canvas.width; x += GRID_SIZE_PX) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += GRID_SIZE_PX) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#334155';
  ctx.font = '12px sans-serif';
  ctx.fillText(state.scale.label, 10, 16);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

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
    ctx.fillText(m.label, midX + 8, midY - 8);
  });

  if ((state.tool === 'wall' || state.tool === 'measure') && state.startPoint && state.previewPoint) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(state.startPoint.x, state.startPoint.y);
    ctx.lineTo(state.previewPoint.x, state.previewPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

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

canvas.addEventListener('mousemove', (event) => {
  if ((state.tool !== 'wall' && state.tool !== 'measure') || !state.startPoint) {
    return;
  }

  state.previewPoint = snapToGrid(getMousePos(event));
  draw();
});

canvas.addEventListener('click', (event) => {
  const snapped = snapToGrid(getMousePos(event));

  if (state.tool === 'evidence') {
    state.evidence.push({ x: snapped.x, y: snapped.y, id: `E-${String(state.evidence.length + 1).padStart(2, '0')}`, notes: '' });
    state.selectedEvidenceIndex = state.evidence.length - 1;
    const selected = state.evidence[state.selectedEvidenceIndex];
    evidenceIdInput.value = selected.id;
    evidenceNotesInput.value = selected.notes;
    draw();
    return;
  }

  if (state.tool === 'select') {
    state.selectedEvidenceIndex = evidenceAt(snapped.x, snapped.y);
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
      state.startPoint = snapped;
      state.previewPoint = snapped;
      statusEl.textContent = `Tool: ${state.tool} (pick end point)`;
      draw();
      return;
    }

    if (state.tool === 'wall') {
      addSegment(state.walls, state.startPoint, snapped);
    } else {
      const d = Math.hypot(snapped.x - state.startPoint.x, snapped.y - state.startPoint.y);
      addSegment(state.measurements, state.startPoint, snapped, {
        distancePx: d,
        label: formatDistance(d),
      });
    }

    state.startPoint = null;
    state.previewPoint = null;
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
  downloadFile('crime-scene-diagram.png', canvas.toDataURL('image/png'));
});

document.getElementById('exportJson').addEventListener('click', () => {
  const payload = {
    caseNumber: document.getElementById('caseNumber').value,
    sceneName: document.getElementById('sceneName').value,
    exportedAt: new Date().toISOString(),
    sceneScale: {
      gridSquarePixels: GRID_SIZE_PX,
      valuePerSquare: state.scale.value,
      unit: state.scale.unit,
      label: state.scale.label,
    },
    walls: state.walls,
    measurements: state.measurements,
    evidence: state.evidence,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadFile('crime-scene-diagram.json', url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById('clearScene').addEventListener('click', () => {
  state.walls = [];
  state.evidence = [];
  state.measurements = [];
  state.startPoint = null;
  state.previewPoint = null;
  state.selectedEvidenceIndex = -1;
  evidenceIdInput.value = '';
  evidenceNotesInput.value = '';
  statusEl.textContent = 'Scene cleared';
  draw();
});

updateScaleFromInputs();
draw();
