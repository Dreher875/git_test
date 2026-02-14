# crime_scene (Desktop Crime Scene Diagramming)

This repository contains the **crime_scene** desktop application for crime scene diagramming, built with Electron.

## Features
- Ribbon-style top interface with tabs: FILE, DRAW, MEASURE, VIEW, EVIDENCE, MANAGE.
- Grouped ribbon tools with SVG icons, text labels, active highlighting, and hover tooltips.
- Furniture sprite system loaded from local `assets/sprites/` SVG files.
- Furniture placement mode from DRAW → Furniture group.
- Furniture selection, move, resize (aspect-locked by default), and rotation handles.
- Furniture rendering order: above walls, below measurement guides.
- Wall drawing, room tool, measurement tools, snap toggles, undo/redo, and export controls.

## Furniture sprites
- `assets/sprites/sofa.svg`
- `assets/sprites/bed.svg`
- `assets/sprites/chair.svg`
- `assets/sprites/table_rect.svg`
- `assets/sprites/table_round.svg`

## Run as a desktop app

```bash
npm install
npm start
```

## Optional checks

```bash
npm run check
```
