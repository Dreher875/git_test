# EvidenceTech MVP (Crime Scene Diagramming)

This repository now contains a working browser-based MVP for crime scene diagramming.

## What it does
- Draw wall segments
- Place evidence markers
- Add/update evidence IDs and notes
- Measure distances between two points
- Export the current scene as JSON
- Export the diagram canvas as PNG

## Run locally
No build step is required.

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`

## Controls
- **Select:** click evidence markers to edit ID/notes
- **Wall:** click start point, then end point
- **Evidence:** click to place marker
- **Measure:** click start point, then end point

## Files
- `index.html` — UI layout
- `styles.css` — styling
- `app.js` — canvas interactions and export logic
