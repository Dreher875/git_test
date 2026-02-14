const canvas = document.getElementById('sceneCanvas');
const ctx = canvas.getContext('2d');

const toolButtons = [...document.querySelectorAll('.tool-btn')];
const wallToolButtons = [...document.querySelectorAll('.wall-tool-btn')];
const statusEl = document.getElementById('status');

const toggleSnapGridBtn = document.getElementById('toggleSnapGrid');
const toggleSnapWallsBtn = document.getElementById('toggleSnapWalls');
const toggleOrthoBtn = document.getElementById('toggleOrtho');

const scalePresetSelect = document.getElementById('scalePreset');
const customScaleWrap = document.getElementById('customScaleWrap');
const customScaleValueInput = document.getElementById('customScaleValue');
const customScaleUnitSelect = document.getElementById('customScaleUnit');
const scaleSummaryEl = document.getElementById('scaleSummary');

const evidenceIdInput = document.getElementById('evidenceId');
const evidenceNotesInput = document.getElementById('evidenceNotes');

const wallPropertiesEmpty = document.getElementById('wallPropertiesEmpty');
const wallPropertiesPanel = document.getElementById('wallPropertiesPanel');
const wallLengthInput = document.getElementById('wallLength');
const wallAngleInput = document.getElementById('wallAngle');
const wallThicknessInput = document.getElementById('wallThickness');
const wallLabelInput = document.getElementById('wallLabel');
const wallTypeSelect = document.getElementById('wallType');

const GRID_SIZE_PX = 24;
const SNAP_THRESHOLD = 14;

const state = {
  tool: 'select',
  wallTool: 'free', // free | straight | room
  snapGrid: true,
  snapWalls: true,
  ortho: false,
  shiftDown: false,
  walls: [],
  measurements: [],
  evidence: [],
  startPoint: null,
  previewPoint: null,
  selectedEvidenceIndex: -1,
  selectedWallIndex: -1,
  scale: { value: 1, unit: 'ft', label: '1 sq = 1 foot' },
};

function unitLabel(unit, value) {
  if (unit === 'in') return value === 1 ? 'inch' : 'inches';
  return value === 1 ? 'foot' : 'feet';
}

function pxToSceneUnits(px) {
  return (px / GRID_SIZE_PX) * state.scale.value;
}

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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestPointOnSegment(point, line) {
  const ax = line.x1; const ay = line.y1;
  const bx = line.x2; const by = line.y2;
  const abx = bx - ax; const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return { x: ax, y: ay };
  const t = ((point.x - ax) * abx + (point.y - ay) * aby) / lenSq;
  const clamped = Math.max(0, Math.min(1, t));
  return { x: ax + abx * clamped, y: ay + aby * clamped };
}

function lineIntersection(w1, w2) {
  const x1 = w1.x1; const y1 = w1.y1; const x2 = w1.x2; const y2 = w1.y2;
  const x3 = w2.x1; const y3 = w2.y1; const x4 = w2.x2; const y4 = w2.y2;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-6) return null;
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  return { x: px, y: py };
}

function effectiveOrthoEnabled() {
  return state.wallTool === 'straight' || state.ortho !== state.shiftDown;
}

function applyOrtho(raw, start) {
  const dx = Math.abs(raw.x - start.x);
  const dy = Math.abs(raw.y - start.y);
  return dx >= dy ? { x: raw.x, y: start.y } : { x: start.x, y: raw.y };
}

function wallSnapCandidates(startPoint) {
  const candidates = [];
  for (let i = 0; i < state.walls.length; i += 1) {
    const w = state.walls[i];
    const p1 = { x: w.x1, y: w.y1 };
    const p2 = { x: w.x2, y: w.y2 };
    candidates.push(p1, p2, { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 });

    if (startPoint) {
      const vx = w.x2 - w.x1;
      const vy = w.y2 - w.y1;
      const len = Math.hypot(vx, vy) || 1;
      const ux = vx / len;
      const uy = vy / len;
      const px = -uy;
      const py = ux;
      const sx = startPoint.x;
      const sy = startPoint.y;
      const toRaw = { x: ux * 80, y: uy * 80 };
      candidates.push({ x: sx + toRaw.x, y: sy + toRaw.y }); // collinear direction sample
      candidates.push({ x: sx + px * 80, y: sy + py * 80 }); // perpendicular direction sample
    }
  }

  for (let i = 0; i < state.walls.length; i += 1) {
    for (let j = i + 1; j < state.walls.length; j += 1) {
      const inter = lineIntersection(state.walls[i], state.walls[j]);
      if (inter) candidates.push(inter);
    }
  }

  return candidates;
}

function snapToWalls(raw, startPoint = null) {
  if (!state.snapWalls || state.walls.length === 0) return raw;

  let best = raw;
  let bestD = SNAP_THRESHOLD;

  state.walls.forEach((w) => {
    const onSeg = nearestPointOnSegment(raw, w);
    const dSeg = distance(raw, onSeg);
    if (dSeg < bestD) { bestD = dSeg; best = onSeg; }

    const endpoints = [{ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }, { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 }];
    endpoints.forEach((pt) => {
      const d = distance(raw, pt);
      if (d < bestD) { bestD = d; best = pt; }
    });
  });

  wallSnapCandidates(startPoint).forEach((c) => {
    const d = distance(raw, c);
    if (d < bestD) { bestD = d; best = c; }
  });

  return best;
}

function processWallPoint(raw, startPoint = null) {
  let p = { ...raw };
  if (startPoint && effectiveOrthoEnabled()) p = applyOrtho(p, startPoint);
  if (state.snapGrid) p = snapToGrid(p);
  p = snapToWalls(p, startPoint);
  return p;
}

function wallLengthAndAngle(wall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const lenPx = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { lenPx, angle };
}

function updateWallPropertiesPanel() {
  if (state.selectedWallIndex < 0) {
    wallPropertiesEmpty.classList.remove('hidden');
    wallPropertiesPanel.classList.add('hidden');
    return;
  }

  const wall = state.walls[state.selectedWallIndex];
  const { lenPx, angle } = wallLengthAndAngle(wall);
  wallLengthInput.value = `${pxToSceneUnits(lenPx).toFixed(2)} ${unitLabel(state.scale.unit, Number(pxToSceneUnits(lenPx).toFixed(2)))}`;
  wallAngleInput.value = `${angle.toFixed(1)}°`;
  wallThicknessInput.value = wall.thickness || 4;
  wallLabelInput.value = wall.label || '';
  wallTypeSelect.value = wall.designation || 'interior';
  wallPropertiesEmpty.classList.add('hidden');
  wallPropertiesPanel.classList.remove('hidden');
}

function setTool(tool) {
  state.tool = tool;
  state.startPoint = null;
  state.previewPoint = null;
  toolButtons.forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
  statusEl.textContent = `Tool: ${tool === 'wall' ? `Wall (${state.wallTool})` : tool}`;
  draw();
}

toolButtons.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
wallToolButtons.forEach((b) => b.addEventListener('click', () => {
  state.wallTool = b.dataset.wallTool;
  wallToolButtons.forEach((x) => x.classList.toggle('active', x === b));
  setTool('wall');
}));

function renderToggles() {
  const map = [
    [toggleSnapGridBtn, state.snapGrid, 'Snap Grid'],
    [toggleSnapWallsBtn, state.snapWalls, 'Snap Walls'],
    [toggleOrthoBtn, state.ortho, 'Ortho'],
  ];
  map.forEach(([btn, val, label]) => {
    btn.textContent = `${label}: ${val ? 'ON' : 'OFF'}`;
    btn.classList.toggle('toggle-on', val);
    btn.classList.toggle('toggle-off', !val);
  });
}

toggleSnapGridBtn.addEventListener('click', () => { state.snapGrid = !state.snapGrid; renderToggles(); draw(); });
toggleSnapWallsBtn.addEventListener('click', () => { state.snapWalls = !state.snapWalls; renderToggles(); draw(); });
toggleOrthoBtn.addEventListener('click', () => { state.ortho = !state.ortho; renderToggles(); draw(); });

window.addEventListener('keydown', (e) => { if (e.key === 'Shift') { state.shiftDown = true; draw(); } });
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') { state.shiftDown = false; draw(); } });

function updateScaleFromInputs() {
  const preset = scalePresetSelect.value;
  if (preset === '6in') state.scale = { value: 6, unit: 'in', label: '1 sq = 6 inches' };
  else if (preset === '1ft') state.scale = { value: 1, unit: 'ft', label: '1 sq = 1 foot' };
  else if (preset === '2ft') state.scale = { value: 2, unit: 'ft', label: '1 sq = 2 feet' };
  else {
    const v = Math.max(0.1, Number(customScaleValueInput.value) || 1);
    const u = customScaleUnitSelect.value;
    state.scale = { value: v, unit: u, label: `1 sq = ${v} ${unitLabel(u, v)}` };
  }
  customScaleWrap.classList.toggle('hidden', preset !== 'custom');
  scaleSummaryEl.textContent = `Current: ${state.scale.label}`;
  updateWallPropertiesPanel();
  draw();
}
scalePresetSelect.addEventListener('change', updateScaleFromInputs);
customScaleValueInput.addEventListener('input', updateScaleFromInputs);
customScaleUnitSelect.addEventListener('change', updateScaleFromInputs);

function drawGrid() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e2e8f0';
  for (let x = 0; x <= canvas.width; x += GRID_SIZE_PX) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= canvas.height; y += GRID_SIZE_PX) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.fillStyle = '#334155';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${state.scale.label} | Shift toggles Ortho`, 10, 16);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  state.walls.forEach((wall, i) => {
    const selected = i === state.selectedWallIndex;
    ctx.lineWidth = wall.thickness || 4;
    ctx.strokeStyle = selected ? '#2563eb' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();
    if (wall.label) {
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px sans-serif';
      ctx.fillText(wall.label, (wall.x1 + wall.x2) / 2 + 6, (wall.y1 + wall.y2) / 2 - 6);
    }
  });

  state.measurements.forEach((m) => {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0284c7';
    ctx.beginPath(); ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); ctx.stroke();
    ctx.fillStyle = '#0369a1';
    ctx.font = '13px sans-serif';
    ctx.fillText(m.label, (m.x1 + m.x2) / 2 + 8, (m.y1 + m.y2) / 2 - 8);
  });

  state.evidence.forEach((e, idx) => {
    const selected = idx === state.selectedEvidenceIndex;
    ctx.beginPath(); ctx.arc(e.x, e.y, selected ? 11 : 9, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#dc2626' : '#ef4444'; ctx.fill();
    ctx.fillStyle = '#111827'; ctx.font = '12px sans-serif';
    ctx.fillText(e.id || `E-${String(idx + 1).padStart(2, '0')}`, e.x + 10, e.y - 10);
  });

  if (state.startPoint && state.previewPoint) {
    ctx.lineWidth = 2; ctx.strokeStyle = '#64748b'; ctx.setLineDash([8, 6]);
    if (state.tool === 'wall' && state.wallTool === 'room') {
      const x1 = state.startPoint.x; const y1 = state.startPoint.y; const x2 = state.previewPoint.x; const y2 = state.previewPoint.y;
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    } else {
      ctx.beginPath(); ctx.moveTo(state.startPoint.x, state.startPoint.y); ctx.lineTo(state.previewPoint.x, state.previewPoint.y); ctx.stroke();
      if (state.tool === 'wall' && state.wallTool === 'free') {
        const d = distance(state.startPoint, state.previewPoint);
        const ang = (Math.atan2(state.previewPoint.y - state.startPoint.y, state.previewPoint.x - state.startPoint.x) * 180) / Math.PI;
        ctx.fillStyle = '#334155'; ctx.font = '12px sans-serif';
        ctx.fillText(`${pxToSceneUnits(d).toFixed(2)} ${unitLabel(state.scale.unit, Number(pxToSceneUnits(d).toFixed(2)))} | ${ang.toFixed(1)}°`, state.previewPoint.x + 8, state.previewPoint.y - 8);
      }
    }
    ctx.setLineDash([]);
  }
}

function pointToSegmentDistance(point, wall) {
  return distance(point, nearestPointOnSegment(point, wall));
}

function wallAt(point) {
  return state.walls.findIndex((w) => pointToSegmentDistance(point, w) <= Math.max(8, (w.thickness || 4) + 2));
}

function evidenceAt(point) {
  return state.evidence.findIndex((e) => distance(point, e) <= 12);
}

canvas.addEventListener('mousemove', (event) => {
  const raw = getMousePos(event);
  if (!state.startPoint) return;

  if (state.tool === 'wall') {
    state.previewPoint = processWallPoint(raw, state.startPoint);
    draw();
  } else if (state.tool === 'measure') {
    let p = { ...raw };
    if (state.snapGrid) p = snapToGrid(p);
    if (state.snapWalls) p = snapToWalls(p, state.startPoint);
    state.previewPoint = p;
    draw();
  }
});

canvas.addEventListener('click', (event) => {
  const raw = getMousePos(event);

  if (state.tool === 'select') {
    state.selectedWallIndex = wallAt(raw);
    state.selectedEvidenceIndex = evidenceAt(raw);

    if (state.selectedEvidenceIndex >= 0) {
      const sel = state.evidence[state.selectedEvidenceIndex];
      evidenceIdInput.value = sel.id;
      evidenceNotesInput.value = sel.notes || '';
      statusEl.textContent = `Selected ${sel.id}`;
    } else {
      evidenceIdInput.value = '';
      evidenceNotesInput.value = '';
      statusEl.textContent = state.selectedWallIndex >= 0 ? 'Wall selected' : 'Nothing selected';
    }

    updateWallPropertiesPanel();
    draw();
    return;
  }

  if (state.tool === 'wall') {
    if (!state.startPoint) {
      state.startPoint = processWallPoint(raw);
      state.previewPoint = state.startPoint;
      statusEl.textContent = `Wall start set (${state.wallTool})`;
      draw();
      return;
    }

    const end = processWallPoint(raw, state.startPoint);
    if (state.wallTool === 'room') {
      const a = state.startPoint;
      const c = end;
      const b = { x: c.x, y: a.y };
      const d = { x: a.x, y: c.y };
      [[a, b], [b, c], [c, d], [d, a]].forEach(([p1, p2]) => state.walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, thickness: 4, label: '', designation: 'interior' }));
    } else {
      state.walls.push({ x1: state.startPoint.x, y1: state.startPoint.y, x2: end.x, y2: end.y, thickness: 4, label: '', designation: 'interior' });
    }

    state.startPoint = null;
    state.previewPoint = null;
    draw();
    return;
  }

  if (state.tool === 'measure') {
    let p = { ...raw };
    if (state.snapGrid) p = snapToGrid(p);
    if (state.snapWalls) p = snapToWalls(p, state.startPoint);

    if (!state.startPoint) {
      state.startPoint = p;
      state.previewPoint = p;
      draw();
      return;
    }

    const d = distance(state.startPoint, p);
    const value = pxToSceneUnits(d);
    state.measurements.push({ x1: state.startPoint.x, y1: state.startPoint.y, x2: p.x, y2: p.y, label: `${value.toFixed(2)} ${unitLabel(state.scale.unit, Number(value.toFixed(2)))}` });
    state.startPoint = null;
    state.previewPoint = null;
    draw();
    return;
  }

  // default: evidence placement
  if (state.tool === 'evidence') {
    let p = { ...raw };
    if (state.snapGrid) p = snapToGrid(p);
    if (state.snapWalls) p = snapToWalls(p);
    state.evidence.push({ x: p.x, y: p.y, id: `E-${String(state.evidence.length + 1).padStart(2, '0')}`, notes: '' });
    draw();
  }
});

document.getElementById('saveEvidence').addEventListener('click', () => {
  if (state.selectedEvidenceIndex < 0) return;
  const item = state.evidence[state.selectedEvidenceIndex];
  item.id = evidenceIdInput.value.trim() || item.id;
  item.notes = evidenceNotesInput.value.trim();
  draw();
});

document.getElementById('saveWallProperties').addEventListener('click', () => {
  if (state.selectedWallIndex < 0) return;
  const wall = state.walls[state.selectedWallIndex];
  wall.thickness = Math.max(1, Number(wallThicknessInput.value) || 4);
  wall.label = wallLabelInput.value.trim();
  wall.designation = wallTypeSelect.value;
  updateWallPropertiesPanel();
  draw();
});

document.getElementById('createOffsetWall').addEventListener('click', () => {
  if (state.selectedWallIndex < 0) {
    statusEl.textContent = 'Select a wall for parallel offset.';
    return;
  }
  const wall = state.walls[state.selectedWallIndex];
  const units = Math.max(0.1, Number(document.getElementById('offsetDistance').value) || 1);
  const px = (units / state.scale.value) * GRID_SIZE_PX;

  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  state.walls.push({
    x1: wall.x1 + nx * px,
    y1: wall.y1 + ny * px,
    x2: wall.x2 + nx * px,
    y2: wall.y2 + ny * px,
    thickness: wall.thickness || 4,
    label: `${wall.label || 'wall'}-offset`,
    designation: wall.designation || 'interior',
  });

  draw();
});

function downloadFile(name, url) {
  const a = document.createElement('a');
  a.href = url;
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
    sceneScale: { gridSquarePixels: GRID_SIZE_PX, ...state.scale },
    toggles: { snapGrid: state.snapGrid, snapWalls: state.snapWalls, ortho: state.ortho },
    wallTool: state.wallTool,
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
  state.measurements = [];
  state.evidence = [];
  state.startPoint = null;
  state.previewPoint = null;
  state.selectedEvidenceIndex = -1;
  state.selectedWallIndex = -1;
  updateWallPropertiesPanel();
  draw();
});

updateScaleFromInputs();
renderToggles();
updateWallPropertiesPanel();
draw();
