# BrainBoard — 3D Idea Studio

An immersive, real-time 3D brainstorming board. Capture ideas as glowing cards floating
in a spatial canvas, connect them into a web, and navigate the whole thing with an
orbiting camera. Built with React 19, Three.js, Zustand, and Tailwind CSS v4.

![status: stable](https://img.shields.io/badge/status-stable-blue)

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build
```

## Features

- **Spatial canvas** — ideas render as billboarded cards that always face the camera,
  floating and breathing with a soft glow in an ambient particle field.
- **Orbit camera** — left-drag to orbit, right-drag to pan, scroll to zoom, with smooth
  inertial damping. Double-click any card (or press `F`) to fly the camera to it.
- **Drag & place** — grab any card and move it through 3D space on a camera-facing plane.
- **Connections** — switch to **Link** mode and click two ideas to weave glowing links
  with traveling pulses. Duplicate links are prevented automatically.
- **Inspector** — click a card to edit its title, notes, and tag. Edits update the 3D
  card live as you type.
- **Tags & filter** — five color-coded tags (Idea / Question / Decision / Blocker / Note).
  Filter the board to a single tag from the top bar.
- **Persistence** — the board auto-saves to `localStorage`. Export / import any board as JSON.
- **Themes & sound** — dark/light theme toggle and subtle WebAudio feedback (toggleable).

## Controls

| Action                 | Input                                   |
| ---------------------- | --------------------------------------- |
| Add idea               | `N` or **New idea** button               |
| Move / orbit           | Left-drag (on a card / empty space)      |
| Pan                    | Right-drag                                |
| Zoom                   | Scroll wheel                              |
| Link mode              | `L` or **Link** button                    |
| Select a card          | Click a card                              |
| Focus a card           | Double-click a card, or `F`               |
| Delete a card          | `Del` / `Backspace`                       |
| Deselect / cancel       | `Esc`                                     |
| Reset camera           | `R` or **⌂**                              |
| Toggle theme           | `T` or **☀/🌙**                           |
| Toggle sound           | `S` or **✦**                              |

## Board model

A board is a serializable object:

```json
{
  "elements": [
    { "id": "a1", "x": 0, "y": 1.1, "z": 0, "title": "Welcome", "tag": "note", "desc": "…" }
  ],
  "links": [
    { "id": "l1", "a": "a1", "b": "a2" }
  ]
}
```

`elements` are cards at 3D positions with a `title`, `tag`, and `desc`. `links` reference
two element ids and are rendered as glowing quadratic curves. Import/Export and
auto-save use this exact shape.

## Architecture

```
src/
  main.jsx              # entry — mounts <App/>
  App.jsx               # composition + keyboard shortcuts + autosave
  Board.jsx             # the Three.js scene: camera, cards, links, particles, picking
  store.js              # Zustand store: elements, links, selection, mode, prefs
  cardTexture.js        # canvas → THREE.CanvasTexture card faces (title/tag/notes)
  sound.js              # tiny WebAudio blips
  index.css             # Tailwind v4 + base + keyframes
  components/
    TopBar.jsx          # brand, stats, tag filters, theme/sound
    Toolbar.jsx         # add, move/link, view, import/export, clear
    Inspector.jsx       # edit the selected card + its connections
    icons.jsx           # inline SVG icon set
```

## Tech stack

React 19 · Three.js (WebGL) · Zustand · Tailwind CSS v4 · Vite

## License

MIT
