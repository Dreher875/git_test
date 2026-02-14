# crime_scene (Desktop Crime Scene Diagramming)

This repository contains the **crime_scene** desktop application for crime scene diagramming, built with Electron.

## Features
- Simplified top toolbar with 3 major areas:
  - Primary Mode Tools (Select, Wall, Room, Measure)
  - Snap Toggles (Snap Grid, Snap Walls, Ortho)
  - Scene Controls (Scale + Export)
- Wall uses a single dropdown with:
  - Free Wall
  - Straight Wall
- Only one primary tool is active at a time.
- Undo / Redo support (buttons + Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z).
- Press **Escape** to deselect the current tool.
- Rectangle room drawing tool.
- Wall properties panel (length, angle, thickness, label, interior/exterior).
- Offset / parallel wall creation from selected wall.
- JSON/PNG export and scene scale presets.

## Run as a desktop app

```bash
npm install
npm start
```

## Optional checks

```bash
npm run check
```
