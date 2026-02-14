# crime_scene (Desktop Crime Scene Diagramming)

This repository contains the **crime_scene** desktop application for crime scene diagramming, built with Electron.

## Features
- Ribbon-style top interface with tabs:
  - FILE
  - DRAW
  - MEASURE
  - VIEW
  - EVIDENCE
  - MANAGE
- Each tab contains grouped icon buttons with text labels under SVG icons.
- Hover tooltips on toolbar controls.
- Active tool highlighting.
- Primary tool workflow with Select / Wall / Room / Measure / Evidence.
- Wall dropdown modes: Free Wall and Straight Wall.
- Independent snap toggles: Snap Grid, Snap Walls, Ortho.
- Undo/Redo support (buttons + Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z).
- Press **Escape** to deselect the current tool.
- Wall properties panel and offset/parallel wall tool.
- Scene scale presets and export controls.

## Run as a desktop app

```bash
npm install
npm start
```

## Optional checks

```bash
npm run check
```
