const canvas = document.getElementById('sceneCanvas');
const ctx = canvas.getContext('2d');

const toolButtons = [...document.querySelectorAll('.tool-btn')];
const furnitureButtons = [...document.querySelectorAll('.furniture-btn')];
const tabButtons = [...document.querySelectorAll('.tab-btn')];
const ribbonPanels = [...document.querySelectorAll('.ribbon-panel')];

const statusEl = document.getElementById('status');
const wallModeDropdown = document.getElementById('wallModeDropdown');

const toggleSnapGridBtn = document.getElementById('toggleSnapGrid');
const toggleSnapWallsBtn = document.getElementById('toggleSnapWalls');
const toggleOrthoBtn = document.getElementById('toggleOrtho');

const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

const scalePresetSelect = document.getElementById('scalePreset');
const customScaleWrap = document.getElementById('customScaleWrap');
const customScaleValueInput = document.getElementById('customScaleValue');
const customScaleUnitSelect = document.getElementById('customScaleUnit');

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
const HANDLE_RADIUS = 6;
const ROTATE_HANDLE_OFFSET = 24;

const state = {
  tool: 'select',
  wallMode: 'free',
  placementFurnitureType: null,
  snapGrid: true,
  snapWalls: true,
  ortho: false,
  shiftDown: false,
  walls: [],
  measurements: [],
  evidence: [],
  scene: { furniture: [] },
  startPoint: null,
  previewPoint: null,
  selectedEvidenceIndex: -1,
  selectedWallIndex: -1,
  selectedFurnitureId: null,
  interaction: null,
  scale: { value: 1, unit: 'ft', label: '1 sq = 1 foot' },
  history: [],
  future: [],
  sprites: {},
};

const SPRITE_FILES = {
  sofa: 'assets/sprites/sofa.svg',
  bed: 'assets/sprites/bed.svg',
  chair: 'assets/sprites/chair.svg',
  table_rect: 'assets/sprites/table_rect.svg',
  table_round: 'assets/sprites/table_round.svg',
};

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function snapshot() {
  return JSON.stringify({
    walls: state.walls,
    measurements: state.measurements,
    evidence: state.evidence,
    scene: state.scene,
    selectedWallIndex: state.selectedWallIndex,
    selectedEvidenceIndex: state.selectedEvidenceIndex,
    selectedFurnitureId: state.selectedFurnitureId,
    snapGrid: state.snapGrid,
    snapWalls: state.snapWalls,
    ortho: state.ortho,
    wallMode: state.wallMode,
    scale: state.scale,
  });
}
function restore(s) {
  const d = JSON.parse(s);
  state.walls = d.walls || [];
  state.measurements = d.measurements || [];
  state.evidence = d.evidence || [];
  state.scene = d.scene || { furniture: [] };
  state.selectedWallIndex = d.selectedWallIndex ?? -1;
  state.selectedEvidenceIndex = d.selectedEvidenceIndex ?? -1;
  state.selectedFurnitureId = d.selectedFurnitureId ?? null;
  state.snapGrid = !!d.snapGrid;
  state.snapWalls = !!d.snapWalls;
  state.ortho = !!d.ortho;
  state.wallMode = d.wallMode || 'free';
  state.scale = d.scale || { value: 1, unit: 'ft', label: '1 sq = 1 foot' };
  wallModeDropdown.value = state.wallMode;
  syncFurnitureSelectionFlags();
  renderToggles();
  updateWallPropertiesPanel();
}
function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > 250) state.history.shift();
  state.future = [];
}
function undo() {
  if (!state.history.length) return;
  state.future.push(snapshot());
  restore(state.history.pop());
  draw();
}
function redo() {
  if (!state.future.length) return;
  state.history.push(snapshot());
  restore(state.future.pop());
  draw();
}

function unitLabel(unit, value) {
  if (unit === 'in') return value === 1 ? 'inch' : 'inches';
  return value === 1 ? 'foot' : 'feet';
}
function pxToSceneUnits(px) { return (px / GRID_SIZE_PX) * state.scale.value; }

function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * canvas.width) / rect.width,
    y: ((event.clientY - rect.top) * canvas.height) / rect.height,
  };
}
function snapToGrid(p) {
  return { x: Math.round(p.x / GRID_SIZE_PX) * GRID_SIZE_PX, y: Math.round(p.y / GRID_SIZE_PX) * GRID_SIZE_PX };
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function nearestPointOnSegment(point, line) {
  const ax = line.x1; const ay = line.y1; const bx = line.x2; const by = line.y2;
  const abx = bx - ax; const aby = by - ay; const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return { x: ax, y: ay };
  const t = ((point.x - ax) * abx + (point.y - ay) * aby) / lenSq;
  const c = Math.max(0, Math.min(1, t));
  return { x: ax + abx * c, y: ay + aby * c };
}
function lineIntersection(w1, w2) {
  const x1 = w1.x1; const y1 = w1.y1; const x2 = w1.x2; const y2 = w1.y2;
  const x3 = w2.x1; const y3 = w2.y1; const x4 = w2.x2; const y4 = w2.y2;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-6) return null;
  return {
    x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom,
    y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom,
  };
}
function wallSnapCandidates() {
  const pts = [];
  state.walls.forEach((w) => pts.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }, { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 }));
  for (let i = 0; i < state.walls.length; i += 1) {
    for (let j = i + 1; j < state.walls.length; j += 1) {
      const p = lineIntersection(state.walls[i], state.walls[j]);
      if (p) pts.push(p);
    }
  }
  return pts;
}
function snapToWalls(raw) {
  if (!state.snapWalls || !state.walls.length) return raw;
  let best = raw;
  let bestD = SNAP_THRESHOLD;
  state.walls.forEach((w) => {
    const on = nearestPointOnSegment(raw, w);
    const d = distance(raw, on);
    if (d < bestD) { best = on; bestD = d; }
  });
  wallSnapCandidates().forEach((p) => {
    const d = distance(raw, p);
    if (d < bestD) { best = p; bestD = d; }
  });
  return best;
}
function effectiveOrthoEnabled() { return state.wallMode === 'straight' || (state.ortho !== state.shiftDown); }
function applyOrtho(raw, start) {
  const dx = Math.abs(raw.x - start.x); const dy = Math.abs(raw.y - start.y);
  return dx >= dy ? { x: raw.x, y: start.y } : { x: start.x, y: raw.y };
}
function processPoint(raw, start = null) {
  let p = { ...raw };
  if (start && effectiveOrthoEnabled()) p = applyOrtho(p, start);
  if (state.snapGrid) p = snapToGrid(p);
  p = snapToWalls(p);
  return p;
}

function setActiveTab(tab) {
  tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  ribbonPanels.forEach((p) => p.classList.toggle('active', p.dataset.panel === tab));
}

tabButtons.forEach((b) => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));

function renderToggles() {
  [[toggleSnapGridBtn, state.snapGrid, 'Snap Grid'], [toggleSnapWallsBtn, state.snapWalls, 'Snap Walls'], [toggleOrthoBtn, state.ortho, 'Ortho']]
    .forEach(([btn, val, name]) => {
      btn.classList.toggle('toggle-on', val);
      btn.classList.toggle('toggle-off', !val);
      btn.title = `${name}: ${val ? 'ON' : 'OFF'}`;
    });
}

function setTool(tool) {
  state.tool = tool;
  state.startPoint = null;
  state.previewPoint = null;
  state.placementFurnitureType = null;
  toolButtons.forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
  furnitureButtons.forEach((b) => b.classList.remove('active'));
  canvas.style.cursor = tool === 'none' ? 'default' : (tool === 'furniture_place' ? 'copy' : 'crosshair');
  statusEl.textContent = tool === 'none' ? 'No tool selected (Esc to deselect)' : (tool === 'wall' ? `Tool: wall (${state.wallMode})` : `Tool: ${tool}`);
  draw();
}

toolButtons.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

furnitureButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    setTool('furniture_place');
    state.placementFurnitureType = btn.dataset.furniture;
    furnitureButtons.forEach((b) => b.classList.toggle('active', b === btn));
    statusEl.textContent = `Placement mode: ${state.placementFurnitureType}`;
  });
});

wallModeDropdown.addEventListener('change', () => { state.wallMode = wallModeDropdown.value; if (state.tool === 'wall') statusEl.textContent = `Tool: wall (${state.wallMode})`; draw(); });
toggleSnapGridBtn.addEventListener('click', () => { state.snapGrid = !state.snapGrid; renderToggles(); draw(); });
toggleSnapWallsBtn.addEventListener('click', () => { state.snapWalls = !state.snapWalls; renderToggles(); draw(); });
toggleOrthoBtn.addEventListener('click', () => { state.ortho = !state.ortho; renderToggles(); draw(); });
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') state.shiftDown = true;
  if (e.key === 'Escape') setTool('none');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
  }
});
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') state.shiftDown = false; });

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
  updateWallPropertiesPanel();
  draw();
}
scalePresetSelect.addEventListener('change', updateScaleFromInputs);
customScaleValueInput.addEventListener('input', updateScaleFromInputs);
customScaleUnitSelect.addEventListener('change', updateScaleFromInputs);

function parsePathFromSvg(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  const path = doc.querySelector('path');
  const viewBox = (svg?.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
  return {
    d: path?.getAttribute('d') || '',
    baseWidth: viewBox[2] || 100,
    baseHeight: viewBox[3] || 100,
  };
}

async function loadSprites() {
  const entries = await Promise.all(Object.entries(SPRITE_FILES).map(async ([type, file]) => {
    const res = await fetch(file);
    const text = await res.text();
    const parsed = parsePathFromSvg(text);
    return [type, { path: new Path2D(parsed.d), baseWidth: parsed.baseWidth, baseHeight: parsed.baseHeight }];
  }));
  state.sprites = Object.fromEntries(entries);
}

function drawGrid() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e2e8f0';
  for (let x = 0; x <= canvas.width; x += GRID_SIZE_PX) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= canvas.height; y += GRID_SIZE_PX) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.fillStyle = '#334155';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${state.scale.label} | Esc deselects current tool`, 10, 16);
  ctx.restore();
}

function syncFurnitureSelectionFlags() {
  state.scene.furniture.forEach((f) => { f.selected = f.id === state.selectedFurnitureId; });
}

function drawFurnitureItem(f) {
  const sprite = state.sprites[f.type];
  if (!sprite) return;

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rotation);
  ctx.scale(f.width / sprite.baseWidth, f.height / sprite.baseHeight);
  ctx.fillStyle = 'rgba(31,41,55,0.05)';
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.fill(sprite.path);
  ctx.stroke(sprite.path);
  ctx.restore();

  if (f.selected) drawFurnitureSelection(f);
}

function furnitureCorners(f) {
  const hw = f.width / 2;
  const hh = f.height / 2;
  const c = Math.cos(f.rotation);
  const s = Math.sin(f.rotation);
  const local = [
    { x: -hw, y: -hh, key: 'nw' },
    { x: hw, y: -hh, key: 'ne' },
    { x: hw, y: hh, key: 'se' },
    { x: -hw, y: hh, key: 'sw' },
  ];
  return local.map((p) => ({
    key: p.key,
    x: f.x + p.x * c - p.y * s,
    y: f.y + p.x * s + p.y * c,
  }));
}

function drawFurnitureSelection(f) {
  const corners = furnitureCorners(f);
  ctx.save();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.stroke();

  corners.forEach((h) => {
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563eb';
    ctx.arc(h.x, h.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const rotateLocal = { x: 0, y: -(f.height / 2 + ROTATE_HANDLE_OFFSET) };
  const c = Math.cos(f.rotation); const s = Math.sin(f.rotation);
  const rx = f.x + rotateLocal.x * c - rotateLocal.y * s;
  const ry = f.y + rotateLocal.x * s + rotateLocal.y * c;

  ctx.beginPath();
  ctx.moveTo(f.x, f.y - f.height / 2);
  ctx.lineTo(rx, ry);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = '#dbeafe';
  ctx.strokeStyle = '#2563eb';
  ctx.arc(rx, ry, HANDLE_RADIUS + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  state.walls.forEach((wall, i) => {
    const selected = i === state.selectedWallIndex;
    ctx.lineWidth = wall.thickness || 4;
    ctx.strokeStyle = selected ? '#2563eb' : '#0f172a';
    ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
    if (wall.label) { ctx.fillStyle = '#1f2937'; ctx.font = '12px sans-serif'; ctx.fillText(wall.label, (wall.x1 + wall.x2) / 2 + 6, (wall.y1 + wall.y2) / 2 - 6); }
  });

  // Furniture above walls, below measurements
  state.scene.furniture.forEach((f) => drawFurnitureItem(f));

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
    ctx.fillStyle = selected ? '#dc2626' : '#ef4444';
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = '12px sans-serif';
    ctx.fillText(e.id || `E-${String(idx + 1).padStart(2, '0')}`, e.x + 10, e.y - 10);
  });

  if (state.startPoint && state.previewPoint) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([8, 6]);
    if (state.tool === 'room') {
      const x1 = state.startPoint.x; const y1 = state.startPoint.y; const x2 = state.previewPoint.x; const y2 = state.previewPoint.y;
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    } else {
      ctx.beginPath(); ctx.moveTo(state.startPoint.x, state.startPoint.y); ctx.lineTo(state.previewPoint.x, state.previewPoint.y); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

function worldToLocal(point, furniture) {
  const dx = point.x - furniture.x;
  const dy = point.y - furniture.y;
  const c = Math.cos(-furniture.rotation);
  const s = Math.sin(-furniture.rotation);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

function furnitureAt(point) {
  for (let i = state.scene.furniture.length - 1; i >= 0; i -= 1) {
    const f = state.scene.furniture[i];
    const local = worldToLocal(point, f);
    if (Math.abs(local.x) <= f.width / 2 && Math.abs(local.y) <= f.height / 2) return f;
  }
  return null;
}

function getFurnitureHandleAt(point, f) {
  const corners = furnitureCorners(f);
  for (const c of corners) {
    if (distance(point, c) <= HANDLE_RADIUS + 3) return { type: 'resize', corner: c.key };
  }
  const rot = {
    x: f.x + (0 * Math.cos(f.rotation) - (-(f.height / 2 + ROTATE_HANDLE_OFFSET)) * Math.sin(f.rotation)),
    y: f.y + (0 * Math.sin(f.rotation) + (-(f.height / 2 + ROTATE_HANDLE_OFFSET)) * Math.cos(f.rotation)),
  };
  if (distance(point, rot) <= HANDLE_RADIUS + 4) return { type: 'rotate' };
  return null;
}

function clearSelections() {
  state.selectedWallIndex = -1;
  state.selectedEvidenceIndex = -1;
  state.selectedFurnitureId = null;
  syncFurnitureSelectionFlags();
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

function updateWallPropertiesPanel() {
  if (state.selectedWallIndex < 0) {
    wallPropertiesEmpty.classList.remove('hidden');
    wallPropertiesPanel.classList.add('hidden');
    return;
  }
  const wall = state.walls[state.selectedWallIndex];
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const lenPx = Math.hypot(dx, dy);
  const value = pxToSceneUnits(lenPx);
  wallLengthInput.value = `${value.toFixed(2)} ${unitLabel(state.scale.unit, Number(value.toFixed(2)))}`;
  wallAngleInput.value = `${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)}°`;
  wallThicknessInput.value = wall.thickness || 4;
  wallLabelInput.value = wall.label || '';
  wallTypeSelect.value = wall.designation || 'interior';
  wallPropertiesEmpty.classList.add('hidden');
  wallPropertiesPanel.classList.remove('hidden');
}

canvas.addEventListener('mousedown', (event) => {
  const p = getMousePos(event);

  if (state.tool === 'select') {
    const target = furnitureAt(p);
    if (target) {
      clearSelections();
      state.selectedFurnitureId = target.id;
      syncFurnitureSelectionFlags();
      const handle = getFurnitureHandleAt(p, target);
      if (handle?.type === 'rotate') {
        state.interaction = { mode: 'rotate_furniture', id: target.id, startAngle: target.rotation, center: { x: target.x, y: target.y } };
      } else if (handle?.type === 'resize') {
        state.interaction = {
          mode: 'resize_furniture',
          id: target.id,
          start: clone(target),
          corner: handle.corner,
          aspect: target.width / target.height,
        };
      } else {
        state.interaction = { mode: 'move_furniture', id: target.id, offset: { x: p.x - target.x, y: p.y - target.y } };
      }
      draw();
      return;
    }
  }

  if (state.tool === 'wall' || state.tool === 'room' || state.tool === 'measure') {
    if (!state.startPoint) {
      state.startPoint = processPoint(p);
      state.previewPoint = state.startPoint;
      draw();
      return;
    }

    pushHistory();
    const end = processPoint(p, state.startPoint);
    if (state.tool === 'wall') {
      state.walls.push({ x1: state.startPoint.x, y1: state.startPoint.y, x2: end.x, y2: end.y, thickness: 4, label: '', designation: 'interior' });
    } else if (state.tool === 'room') {
      const a = state.startPoint; const c = end; const b = { x: c.x, y: a.y }; const d = { x: a.x, y: c.y };
      [[a, b], [b, c], [c, d], [d, a]].forEach(([p1, p2]) => state.walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, thickness: 4, label: '', designation: 'interior' }));
    } else {
      const d = distance(state.startPoint, end);
      const value = pxToSceneUnits(d);
      state.measurements.push({ x1: state.startPoint.x, y1: state.startPoint.y, x2: end.x, y2: end.y, label: `${value.toFixed(2)} ${unitLabel(state.scale.unit, Number(value.toFixed(2)))}` });
    }
    state.startPoint = null;
    state.previewPoint = null;
    draw();
    return;
  }

  if (state.tool === 'furniture_place' && state.placementFurnitureType) {
    const pos = processPoint(p);
    const sprite = state.sprites[state.placementFurnitureType];
    if (!sprite) return;
    pushHistory();
    clearSelections();
    const item = {
      id: uid('furn'),
      type: state.placementFurnitureType,
      x: pos.x,
      y: pos.y,
      width: sprite.baseWidth,
      height: sprite.baseHeight,
      rotation: 0,
      selected: true,
    };
    state.scene.furniture.push(item);
    state.selectedFurnitureId = item.id;
    syncFurnitureSelectionFlags();
    draw();
  }
});

canvas.addEventListener('mousemove', (event) => {
  const p = getMousePos(event);

  if (state.interaction) {
    const furn = state.scene.furniture.find((f) => f.id === state.interaction.id);
    if (!furn) return;

    if (state.interaction.mode === 'move_furniture') {
      furn.x = p.x - state.interaction.offset.x;
      furn.y = p.y - state.interaction.offset.y;
    } else if (state.interaction.mode === 'rotate_furniture') {
      furn.rotation = Math.atan2(p.y - furn.y, p.x - furn.x) + Math.PI / 2;
    } else if (state.interaction.mode === 'resize_furniture') {
      const local = worldToLocal(p, furn);
      const w = Math.max(20, Math.abs(local.x) * 2);
      const h = Math.max(20, Math.abs(local.y) * 2);
      if (state.shiftDown) {
        furn.width = w;
        furn.height = h;
      } else {
        const ratio = state.interaction.aspect || 1;
        if (w / h > ratio) { furn.width = w; furn.height = w / ratio; }
        else { furn.height = h; furn.width = h * ratio; }
      }
    }

    draw();
    return;
  }

  if (state.startPoint && (state.tool === 'wall' || state.tool === 'room' || state.tool === 'measure')) {
    state.previewPoint = processPoint(p, state.startPoint);
    draw();
  }
});

canvas.addEventListener('mouseup', () => {
  if (state.interaction) {
    pushHistory();
    state.interaction = null;
    draw();
  }
});

canvas.addEventListener('click', (event) => {
  const p = getMousePos(event);
  if (state.tool === 'select' && !state.interaction) {
    clearSelections();
    const furn = furnitureAt(p);
    if (furn) {
      state.selectedFurnitureId = furn.id;
      syncFurnitureSelectionFlags();
      statusEl.textContent = 'Furniture selected';
    } else {
      state.selectedWallIndex = wallAt(p);
      state.selectedEvidenceIndex = evidenceAt(p);
      if (state.selectedEvidenceIndex >= 0) {
        const sel = state.evidence[state.selectedEvidenceIndex];
        evidenceIdInput.value = sel.id;
        evidenceNotesInput.value = sel.notes || '';
      }
    }
    updateWallPropertiesPanel();
    draw();
  }
});

document.getElementById('saveEvidence').addEventListener('click', () => {
  if (state.selectedEvidenceIndex < 0) return;
  pushHistory();
  const item = state.evidence[state.selectedEvidenceIndex];
  item.id = evidenceIdInput.value.trim() || item.id;
  item.notes = evidenceNotesInput.value.trim();
  draw();
});

document.getElementById('saveWallProperties').addEventListener('click', () => {
  if (state.selectedWallIndex < 0) return;
  pushHistory();
  const wall = state.walls[state.selectedWallIndex];
  wall.thickness = Math.max(1, Number(wallThicknessInput.value) || 4);
  wall.label = wallLabelInput.value.trim();
  wall.designation = wallTypeSelect.value;
  updateWallPropertiesPanel();
  draw();
});

document.getElementById('createOffsetWall').addEventListener('click', () => {
  if (state.selectedWallIndex < 0) return;
  pushHistory();
  const wall = state.walls[state.selectedWallIndex];
  const units = Math.max(0.1, Number(document.getElementById('offsetDistance').value) || 1);
  const px = (units / state.scale.value) * GRID_SIZE_PX;
  const dx = wall.x2 - wall.x1; const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; const ny = dx / len;
  state.walls.push({ x1: wall.x1 + nx * px, y1: wall.y1 + ny * px, x2: wall.x2 + nx * px, y2: wall.y2 + ny * px, thickness: wall.thickness || 4, label: `${wall.label || 'wall'}-offset`, designation: wall.designation || 'interior' });
  draw();
});

function downloadFile(name, url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}
function runExport() {
  const type = document.getElementById('exportDropdown').value;
  if (type === 'png') {
    draw();
    downloadFile('crime-scene-diagram.png', canvas.toDataURL('image/png'));
    return;
  }
  const payload = {
    caseNumber: document.getElementById('caseNumber').value,
    sceneName: document.getElementById('sceneName').value,
    exportedAt: new Date().toISOString(),
    sceneScale: { gridSquarePixels: GRID_SIZE_PX, ...state.scale },
    scene: { furniture: state.scene.furniture },
    walls: state.walls,
    measurements: state.measurements,
    evidence: state.evidence,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadFile('crime-scene-diagram.json', url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById('runExport').addEventListener('click', runExport);

document.getElementById('clearScene').addEventListener('click', () => {
  pushHistory();
  state.walls = [];
  state.measurements = [];
  state.evidence = [];
  state.scene.furniture = [];
  state.startPoint = null;
  state.previewPoint = null;
  clearSelections();
  updateWallPropertiesPanel();
  draw();
});

async function init() {
  await loadSprites();
  setActiveTab('draw');
  updateScaleFromInputs();
  renderToggles();
  updateWallPropertiesPanel();
  draw();
}

init();
