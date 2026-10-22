# Chiron Pur Sport — A Cinematic 3D Study

An interactive, scroll-driven real-time 3D web experience presenting the **Bugatti Chiron Pur Sport** like a luxury launch film. Built with **Three.js**, **GSAP ScrollTrigger**, **Lenis**, and **postprocessing (pmndrs)**.

---

## Highlights

- **Scroll-Scrubbed Cinematic Choreography:** 6 distinct chapters from a dark hero reveal with dynamic light sweep to exterior orbits, multi-layer exploded assembly, micro detail close-ups, and an interactive finish customizer.
- **Data-Driven Exploded View:** Separates 196 distinct mesh nodes into 6 layered groups (`body_panels`, `glass_and_lights`, `interior`, `mechanical`, `brakes`, `wheels`) with organic seeded jitter, dynamic callout camera framing, inactive layer focus fading (~12% opacity), and screen-projected SVG leader lines.
- **Procedural Powertrain Internals:** Custom lightweight artistic procedural W16 quad-turbo engine, intake plenums, turbo housings, and structural chassis subframe.
- **Ultra-Optimized 3D Asset Pipeline:** Compressed the raw 48.58 MB model down to **2.69 MB** (well under the 15 MB limit) using Draco geometry quantization and WebP texture compression while preserving every node name and hierarchy.
- **PBR Materials Pass:** Automotive clearcoat physical shaders, glowing emissive lamp modules, tinted aero glass, and runtime paint finish switching (Deep Rosso, French Racing Blue, Stealth Noir, Liquid Silver).
- **Post-Processing & Adaptive Scaling:** Selective bloom, edge chromatic aberration, cinematic film vignette, and real-time FPS monitoring with automatic tiered quality degradation for lower-end hardware and mobile devices.
- **Accessibility & Fallbacks:** Keyboard-navigable chapter indicators, `prefers-reduced-motion` compliance, `aria-live` callout announcements, and graceful WebGL hardware detection fallback.

---

## Project Structure

```
.
├── config/
│   ├── explode.json         # Per-group explosion vectors, distances, stagger, and camera targets
│   ├── groups.json          # Mesh node name -> group classification and confidence
│   └── parts.json           # Extracted metadata (dimensions, centers, triangles, materials)
├── public/
│   ├── draco/               # Draco WebAssembly decoder files
│   └── models/
│       └── veyron.glb       # Optimized GLB asset (2.69 MB)
├── scripts/
│   ├── dump-parts.mjs       # Extracts 3D part metadata from GLB into config/parts.json
│   ├── generate-groups.mjs  # Generates initial groups.json with heuristics & confidence
│   └── optimize.mjs         # Phase 0 GLB compression pipeline
├── src/
│   ├── content.js           # All copy, headlines, specification figures, and color presets
│   ├── explode.js           # Exploded view controller, organic jitter & 3D leader line projection
│   ├── loader.js            # GLTF/Draco loader, scale normalization & procedural powertrain
│   ├── main.js              # Application entry point, render loop & shader pre-compilation
│   ├── materials.js         # Physical materials setup, clearcoat paint & focus opacity fading
│   ├── overlay.js           # HTML/SVG overlays, letterbox bars, leader lines & color switcher
│   ├── post.js              # Post-processing chain (Bloom, Vignette, Chromatic Aberration) & adaptive FPS
│   ├── scene.js             # Three.js scene, RoomEnvironment, rim lighting & glossy ground reflector
│   ├── style.css            # Dark glassmorphic design system and typography
│   └── timeline.js          # Lenis smooth scroll, GSAP ScrollTrigger & window.__setProgress hook
├── tools/
│   └── inspector.html       # Debug 3D part inspection tool with raycast selection & group assignment
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**

### Installation

```bash
# Clone the repository and install dependencies
npm install
```

### Running Locally

```bash
# Start Vite development server
npm run dev
```

Visit `http://localhost:3000/` to experience the website.

To inspect meshes and test group assignments:
Visit `http://localhost:3000/tools/inspector.html`.

### Production Build

```bash
# Build optimized static distribution
npm run build

# Preview production build locally
npm run preview
```

The output in `dist/` is completely static and ready for instant deployment to Vercel, Netlify, or GitHub Pages.

---

## Configuration & Customization

### 1. Editing Text, Specs, & Paint Presets (`src/content.js`)

All copy and numerical figures live centrally in [`src/content.js`](file:///f:/Projects/Cinematic%203D%20Car%20Website/src/content.js):

- **Toggle manufacturer badges:**
  ```javascript
  export const CONFIG = {
    SHOW_LOGOS: true, // set to false for an unbranded neutral vehicle
    ...
  }
  ```
- **Edit paint color presets:** Modify `CONFIG.PAINT_PRESETS` with custom hex codes, metalness, and roughness values.
- **Specifications:** All numbers are clearly marked `// PLACEHOLDER` and can be adjusted without touching application logic.

### 2. Tuning the Exploded View (`config/explode.json`)

Each layer's motion vector, distance multiplier, and camera focus are defined in [`config/explode.json`](file:///f:/Projects/Cinematic%203D%20Car%20Website/config/explode.json):

```json
"body_panels": {
  "direction": [0.0, 1.0, 0.1],
  "distance": 1.1,
  "start": 0.0,
  "end": 0.25,
  "ease": "power2.out",
  "camera": {
    "position": [3.4, 2.4, 3.2],
    "target": [0.0, 0.9, 0.3],
    "fov": 38
  }
}
```

### 3. Testing Scroll States in DevTools

The experience exposes a global scrub helper in the browser console:

```javascript
// Jump directly to any progress from 0.0 to 1.0:
window.__setProgress(0.18); // Chapter 2: Exterior Orbit
window.__setProgress(0.36); // Chapter 3: Body Panels Exploded
window.__setProgress(0.50); // Chapter 3: Cockpit Interior Callout
window.__setProgress(0.70); // Chapter 3: Wheels & Brakes Exploded
window.__setProgress(0.85); // Chapter 5: Headlight Macro Detail
window.__setProgress(1.00); // Chapter 6: Call To Action & Finish Configurator
```

---

## Legal & Credits

- **Disclaimer:** Fan-made portfolio concept. Non-commercial study. Not affiliated with, endorsed by, or sponsored by Bugatti Automobiles S.A.S. or any automobile manufacturer.
- **3D Asset:** Base car model courtesy of 3D Artist via CGTrader. Optimized and modified for real-time web rendering.
