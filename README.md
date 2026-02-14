# codex/crimescene (Desktop Crime Scene Diagramming)

This repository contains the **codex/crimescene** desktop application for crime scene diagramming, built with Electron.

## Features
- Draw wall segments
- Place evidence markers
- Add/update evidence IDs and notes
- Measure distances between two points
- Export the current scene as JSON
- Export the diagram canvas as PNG

## Run as a desktop app

```bash
npm install
npm start
```

## Optional checks

```bash
npm run check
```

## Controls
- **Select:** click evidence markers to edit ID/notes
- **Wall:** click start point, then end point
- **Evidence:** click to place marker
- **Measure:** click start point, then end point

## Files
- `main.js` — Electron main process/window bootstrap
- `index.html` — UI layout
- `styles.css` — styling
- `app.js` — canvas interactions and export logic
- `crime_scene_software_prd.md` — product requirements draft
