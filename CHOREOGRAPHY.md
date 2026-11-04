# Bugatti Chiron Pur Sport — Cinematic Launch Film Choreography

> **Architecture & Motion Direction Manual**  
> Concept: The scroll bar is the film reel. Every chapter features **ONE named camera move**, **ONE lighting mood**, and **ONE line of copy**.

---

## 1. Chapter Choreography Overview

| Ch | Title | Progress Range | Named Camera Move | Lighting Mood | Hero Copy Line | UI & Film Artifacts |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **The Reveal** | `0.00 – 0.12` | Low-Angle Ground Push-In (~6 m, FOV 28°) | Silhouette Strip Sweep (pure black, $X: -6 \to +6$) | *"Not built to be seen. Built to be felt."* | 8vh letterbox bars, synchronized letter sweep mask, Film Reel HUD `01 / 06` |
| **02** | **The Orbit** | `0.12 – 0.30` | 270° Flank Arc with Rack Focus | Studio Rim & Under-Glow | *"Walk the room."* | 4 angle annotations: Rear (*"The fins."*), Side (*"The single line."*), Front (*"The grille."*), Top (*"The spine."*); SVG leader lines |
| **03** | **The Dolly Zoom** | `0.30 – 0.36` | Hitchcock Dolly Zoom (FOV $25^\circ \to 60^\circ$) | Dark Void / Emphasis Cut (audio & bloom cut) | *"Now look inside."* | Full viewport black fade, centered transition line, zero handheld sway |
| **04** | **The Teardown** | `0.36 – 0.75` | Vertical Hydraulic Crane & Subsystem Snap | High-Contrast Technical Studio (inactive layers at 12%) | *"Layer by layer."* | Specimen cards per layer (Mechanical: *"Four turbos. One decision: more."* / `1,600 NM`), vertical Depth Ruler on right edge |
| **05** | **The Macro** | `0.75 – 0.90` | Probe-Lens Surface Crawl (FOV 12°) | Clearcoat Highlight Streaks & Anamorphic Flare | *"Details nobody asked for."* | Serif-italic director's notes in corner (*"Every vent here moves air. None of them are decoration."*) |
| **06** | **The Finale** | `0.90 – 1.00` | Centered Slow Turntable & 360° Free Orbit | Showroom Spotlight & Ambient Paint Sweep | *"Make it yours."* | ~2% push-and-settle "breath" on paint change, body light sweep, ambient tint, single-line CTA: *"Reserve a viewing."* |

---

## 2. In-Depth Chapter Specifications

### 01 THE REVEAL (`0.00 – 0.12`) — *"Darkness, then speed"*
- **Camera:** Low-angle push-in from ground level ($Y \approx 0.22\,\text{m}$, distance $\sim 5.8\,\text{m}$), telephoto FOV 28°. Zero lateral drift.
- **Lighting:** Hemisphere and key lights set to 0 (pure void). A single razor-sharp strip light (`stripLight`) sweeps laterally from $X = -6.0\,\text{m} \to +6.0\,\text{m}$, slicing the silhouette of the carbon body in pieces. Front twin headlamp beams ignite between $p = 0.07 \to 0.12$.
- **Typography & UI:** Top and bottom cinematic letterbox bars (`8vh`). The headline *"Not built to be seen. Built to be felt."* reveals letters progressively from left to right via a gradient mask tied directly to the strip light's $X$ coordinate. HUD displays `01 / 06 // THE REVEAL // GROUND PUSH-IN`.

### 02 THE ORBIT (`0.12 – 0.30`) — *"Walk the room"*
- **Camera:** 270° arc starting at the rear-three-quarter, sweeping around the left flank, past the front horseshoe grille, and rising to inspect the central carbon spine. Controlled handheld drift (amplitude $0.008\,\text{m}$, roll $\le 0.4^\circ$).
- **Optical Rack Focus:** Focus shifts along the flank ($p = 0.14 \to 0.22$), pulling sharpness from the forged magnesium wheel to the deep rosso door scoop.
- **Annotations:** Four callouts appear sequentially with SVG leader lines anchored to 3D vehicle coordinates:
  1. $0.120 - 0.165$: **Rear** — *"The fins."*
  2. $0.165 - 0.210$: **Side** — *"The single line."*
  3. $0.210 - 0.255$: **Front** — *"The grille."*
  4. $0.255 - 0.300$: **Top** — *"The spine."*

### 03 THE DOLLY ZOOM (`0.30 – 0.36`) — *"The moment you realize"*
- **Camera:** Hitchcock Dolly Zoom executed exactly once on the timeline. Camera dollies in along the view axis ($4.80\,\text{m} \to 1.84\,\text{m}$) while the lens FOV widens ($25^\circ \to 60^\circ$). Apparent on-screen size is held strictly constant within $<0.7\%$ using:
  $$k = d \cdot \tan\left(\frac{\text{FOV}}{2}\right) \approx 1.064$$
- **Cinematic Pacing:** Handheld sway drops to 0. Audio engine drone is ducked and bloom is cut to 0.0. A black screen overlay reveals the transition line: *"Now look inside."*

### 04 THE TEARDOWN (`0.36 – 0.75`) — *"Layer by layer"*
- **Camera:** Vertical hydraulic crane rising from $Y: 1.8\,\text{m} \to 3.4\,\text{m}$, snapping to framed close-ups of each subsystem with short whip-pans between key layers.
- **Subsystems:** Explodes along data-driven vectors from `config/explode.json`:
  1. `body_panels` ($T = 0.00 \to 0.18$): Carbon monocoque & aero shell
  2. `glass_and_lights` ($T = 0.18 \to 0.35$): Polycarbonate glazing & optical arrays
  3. `interior` ($T = 0.35 \to 0.52$): Alcantara cockpit & titanium ergonomics
  4. `mechanical` ($T = 0.52 \to 0.70$): Quad-turbo 8.0L W16 powertrain (*"Four turbos. One decision: more."* / `1,600 NM`)
  5. `brakes` ($T = 0.70 \to 0.85$): Carbon-silicon-carbide rotors & 8-piston titanium calipers
  6. `wheels` ($T = 0.85 \to 1.00$): Forged magnesium aero-blade system
- **UI:** Specimen cards with technical story and hero numbers; vertical interactive **Depth Ruler** on the right viewport edge tracking the active layer.

### 05 THE MACRO (`0.75 – 0.90`) — *"Details nobody asked for"*
- **Camera:** Probe-lens surface crawl (extreme low FOV 12°), gliding millimetres above the carbon body weave to the headlight projector lens, concluding with a rack focus pull-back. Handheld sway: 0.
- **Lighting & Optics:** Crisp specular streaks along the clearcoat, selective bloom on emissives, and horizontal cyan-blue anamorphic lens flares.
- **Copy:** Serif-italic director's notes in the lower corner:
  - *"Every vent here moves air. None of them are decoration."*
  - *"Tolerances measured in microns; downforce measured in Gs."*

### 06 THE FINALE (`0.90 – 1.00`) — *"Make it yours"*
- **Camera:** Slow turntable rotation, vehicle centered. Enables unrestricted 360° drag-to-orbit exploration.
- **Color Reveal:** Switching paint swatches triggers:
  1. A ~2% push-and-settle "breath" pulse on the vehicle scale.
  2. A directional light band sweeping across the body so the color is revealed dynamically, not swapped abruptly.
  3. Subtle showroom background color tinting toward the chosen paint hex.
- **CTA:** Single line: *"Reserve a viewing."*

---

## 3. Retuning Keyframes & Camera Trajectories

All camera transforms and optical channels are declared in [`config/camera.json`](file:///f:/Projects/Cinematic%203D%20Car%20Website/config/camera.json).

### Keyframe Structure
```json
{
  "p": 0.33,
  "pos": [0.0, 0.40, 2.50],
  "target": [0.0, 0.45, 0.0],
  "fov": 46.0,
  "roll": 0.0,
  "focusDistance": 2.5,
  "aperture": 0.0,
  "handheldAmp": 0.0,
  "chapter": 2,
  "note": "Mid-dolly zoom"
}
```

### Channel Tuning Parameters
- `pos`: 3D eye position `[X, Y, Z]` in Three.js world space.
- `target`: 3D look-at coordinate `[X, Y, Z]`.
- `fov`: Camera vertical Field of View in degrees.
- `roll`: True optical rotation in degrees around the line of sight (applied via `camera.rotateZ`).
- `focusDistance`: Depth-of-Field focal plane distance from camera (in meters).
- `aperture`: Depth-of-Field blur amount ($0.0 = \text{pin-sharp}$, $0.3 = \text{cinematic shallow bokeh}$).
- `handheldAmp`: Amplitude of multi-frequency sine noise ($0.0 = \text{tripod/crane}$, $0.008 = \text{organic handheld}$).

### Visual In-Scene Debugger
To view the Catmull-Rom splines, trajectory points, and look-at targets live inside the 3D scene, open the browser console and run:
```js
window.__camDebug(true);  // Turn splines on
window.__camDebug(false); // Turn splines off
```
- **Cyan Curve:** Camera position trajectory spline.
- **Amber Curve:** Camera look-at target spline.
- **Red Spheres:** Precision keyframe knot positions.

---

## 4. Test Checkpoints (`window.__setProgress`)

Verify deterministic scrub behavior at each of the following target checkpoints:

| Checkpoint | Chapter | Expected Visual State |
| :--- | :--- | :--- |
| `__setProgress(0.05)` | 01 The Reveal | Ground push-in at ~5.8 m; strip light slicing silhouette; letter reveal mask at ~40% |
| `__setProgress(0.18)` | 02 The Orbit | Flank arc passes rear wheel; rack focus blur on body panels; "The single line." annotation |
| `__setProgress(0.28)` | 02 The Orbit | Top/spine view before transition; "The spine." annotation active with leader line |
| `__setProgress(0.33)` | 03 The Dolly Zoom | Mid-dolly zoom (FOV ~46°); car scale identical to 0.30; black screen *"Now look inside."* |
| `__setProgress(0.45)` | 04 The Teardown | Shell & optical layers lifted; monocoque specimen card displayed; Depth Ruler at 02 |
| `__setProgress(0.60)` | 04 The Teardown | Quad-turbo W16 isolated; *"Four turbos. One decision: more."* (`1,600 NM`); Depth Ruler at 04 |
| `__setProgress(0.70)` | 04 The Teardown | Full structural explosion; carbon brakes and magnesium aero blades exposed; Depth Ruler at 06 |
| `__setProgress(0.82)` | 05 The Macro | Probe crawl millimeters above headlight; clearcoat streaks; director's note in corner |
| `__setProgress(0.95)` | 06 The Finale | Centered turntable; customizer dock active; 360° drag hint; *"Reserve a viewing."* |
