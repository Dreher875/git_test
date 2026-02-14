# crime_scene (Desktop Crime Scene Diagramming)

This repository contains the **crime_scene** desktop application for crime scene diagramming, built with Electron.

## Features
- Horizontal top toolbar with grouped controls:
  - Selection Tools
  - Wall Tools
  - Snap Toggles
  - Measurement Tools
  - Scene Settings
- Wall tools:
  - Free Draw Wall mode
  - Straight (Ortho-assisted) Wall mode
  - Rectangle Room tool (auto-creates 4 connected walls)
- Independent toggles always visible:
  - Snap to Grid
  - Snap to Walls
  - Ortho
- Shift key temporarily toggles ortho constraint while drawing walls.
- Snap-to-wall behaviors include endpoint, midpoint, segment/intersection proximity snaps.
- Scene scale settings (1 sq = 6 inches, 1 foot, 2 feet, or custom)
- Wall properties panel (length, angle, thickness, label, interior/exterior)
- Offset / Parallel wall tool from selected wall
- Measurements, evidence markers, JSON export, PNG export

## Run as a desktop app

```bash
npm install
npm start
```

## Optional checks

```bash
npm run check
```
