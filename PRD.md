# PRD: Cinematic 3D Car Website (Portfolio Project)

**Working title:** "Veyron: A Cinematic Study" (title and copy are configurable in `src/content.js`)
**Type:** Fan-made portfolio piece, non-commercial
**Input available to the agent:** one file, `cars_clean.glb`. No other assets. No HDRI, no textures, no fonts, no audio.
**Primary instruction to the agent:** work in the phases below, in order. Complete and verify one task before starting the next. Do not start the whole site in one pass.

---

## 1. Summary

A single-page, scroll-driven website that presents one car like a launch film. The user scrolls and a real-time 3D scene responds: a cinematic reveal, a slow exterior orbit, then an **exploded view** where the car separates into layers (body, cabin, mechanicals, wheels and brakes). Each layer gets a camera move and a short feature description. The car then reassembles and the page closes on detail shots and a call to action.

The point of the project is to show 3D web development, motion design and storytelling in one polished piece.

## 2. Goals and non-goals

**Goals**
1. A smooth, cinematic, scroll-scrubbed 3D experience that runs well on a mid-range laptop and acceptably on a phone.
2. A convincing, data-driven exploded view built from the model's separate meshes.
3. Total page weight small enough to load on a normal connection: the optimized GLB must be **15 MB or less** (see Phase 0).
4. Clean, readable code and a short README so the project can be explained in a portfolio case study.

**Non-goals**
- No user accounts, backend, database, payments or analytics.
- No audio (no audio assets exist). A mute toggle is not needed.
- No real engineering accuracy. Internals only need to look plausible.
- No claim of affiliation with any car manufacturer (see section 11).

## 3. The asset: what is known about `cars_clean.glb`

These facts come from inspecting the source Blender file. **Treat them as strong hints, not guarantees, and verify them in Phase 1.** The export settings may have changed names or axes.

- About **196 separate meshes**, roughly 660,000 triangles after cleanup. The original file was about 4.2M triangles; the four wheels were decimated to ~30k triangles each.
- Meshes are **not merged**. Never merge, join or flatten them. The exploded view depends on them staying separate.
- Most mesh names are meaningless leftovers from 3ds Max (`Box032.001`, `Object024.003`). A minority are descriptive.
- Exported **Y-up**. The car's **nose points toward +Z**, and its centerline is near **x = 0.067**. The car is about 3.4 units long, 1.6 wide and 0.9 tall. The scale is arbitrary, so normalize it in code.
- GLTFLoader sanitizes node names (for example, it strips dots, so `Plane001.004` becomes `Plane001004`). The original name may be kept in `userData.name`. Use one consistent naming approach everywhere and document which one.

**Named parts expected in the file (verify):**

| Name | What it is |
|---|---|
| `wheel_FL`, `wheel_FR`, `wheel_RL`, `wheel_RR` | Complete wheel assemblies (tire, rim, brake disc). About 0.52 units across. Approximate centers (x, y, z): FL (0.68, 0.26, 1.13), FR (-0.55, 0.26, 1.13), RL (0.68, 0.26, -0.84), RR (-0.55, 0.26, -0.84). Left is +X when the car faces +Z. |
| `Caliper_*` | Brake calipers. `Caliper_039*` likely covers both calipers on the right side as one mesh. |
| `GLASS*`, materials `Front Glass`, `Head Lights Glass`, `GLASS_TAIL_LIGHT` | Glass and lamp covers |
| `LIGHT_GLOW*`, `TAIL_GLOW*`, `METAL_TAIL_LIGHT*`, `CHROME_REFLECTOR*`, material `Brake_Lamp` | Lighting parts |
| `chassis*`, `cooler*`, material `mETAL` | Mechanical parts. The chassis is small (~8.6k triangles), so it may be a frame rather than a full underbody. |
| `int*`, `SEAT_STITCHES*`, `STITCH*`, `speedook*`, leather materials | Interior parts |
| `bugatti_logo*` | Logo meshes (see section 11) |
| `Box002.004` | One large shell-like piece (about 1.4 x 3.1 x 0.7, ~40k triangles). Probably a body or underbody shell. |
| Materials `paint*`, `Car Paint` | Painted body panels |

**No engine is named.** Assume the car has **no engine mesh** until Phase 1 proves otherwise. If none exists, build a procedural placeholder (see 7.4).

## 4. Tech stack

- **Vite** with plain JavaScript or TypeScript (agent's choice; pick one and stay consistent)
- **three** (latest stable, pinned) with `GLTFLoader` and `DRACOLoader`
- **gsap** + **ScrollTrigger** for the master timeline
- **lenis** for smooth scrolling
- **postprocessing** (pmndrs) for bloom, vignette, noise, subtle chromatic aberration, optional depth of field
- No UI framework. HTML and CSS overlays for text.
- Keep dependencies minimal. Ask before adding anything not listed here.

**Self-contained lighting:** no HDRI file is available. Use three's `RoomEnvironment` with `PMREMGenerator` for environment reflections, plus custom key, rim and fill lights. Do not download external assets at runtime other than web fonts.

## 5. Project structure

```
project-root/
  PRD.md
  source/cars_clean.glb          # untouched original, never edit
  public/
    models/veyron.glb            # optimized output from Phase 0
    draco/                       # decoder files copied from three
  scripts/
    optimize.mjs (or .sh)        # Phase 0 compression
    dump-parts.mjs               # Phase 1 mesh listing
  src/
    main.js
    scene.js        # renderer, camera, lights, floor, environment
    loader.js       # GLB loading, progress, scale normalization, pivots
    materials.js    # paint, glass, emissive, rubber, metal upgrades
    explode.js      # data-driven exploded view
    timeline.js     # scroll -> progress -> chapters and camera path
    overlay.js      # HTML labels, leader lines, stats, chapter UI
    post.js         # post-processing and adaptive quality
    content.js      # all text, numbers, labels (editable by the owner)
  config/
    groups.json     # mesh name -> group (output of Phase 1)
    explode.json    # per-group direction, distance, stagger, camera focus
  tools/inspector.html (or /inspector route)
  README.md
```

Move `cars_clean.glb` into `source/` first and treat it as read-only.

---

## 6. Phased plan

### Phase 0: Compress the model

**Why:** the exported GLB is about 46 MB. Geometry is only about 660k triangles, so the weight is mostly **textures**, possibly with no geometry compression. Target: **15 MB or less**, with all mesh names preserved.

**Steps**

1. Check Node is available (`node -v`). If not, tell the owner and stop.
2. Inspect the file:
   ```
   npx @gltf-transform/cli inspect source/cars_clean.glb
   ```
   Record the textures table (count, resolution, size) and the mesh table (vertex counts). Report the findings before compressing.
3. Optimize. **Do not use default flags.** The tool's defaults join meshes, flatten the node hierarchy and merge materials, which would destroy the exploded view.
   ```
   npx @gltf-transform/cli optimize source/cars_clean.glb public/models/veyron.glb \
     --compress draco \
     --texture-compress webp --texture-size 2048 \
     --join false --flatten false --simplify false \
     --instance false --palette false
   ```
   If a flag is not recognized, run `optimize --help` and adapt. The intent is fixed: Draco geometry, WebP textures capped at 2048 px, **and no merging of meshes, nodes or materials**.
4. Check the size. If it is over 15 MB, step down in this order and re-check each time:
   1. `--texture-size 1024`
   2. Lower the Draco quantization (`--quantize-position 12` and similar options, if available)
   3. Report back. The owner may decimate the 40k-triangle shell pieces further in Blender.
5. Copy the Draco decoder: `node_modules/three/examples/jsm/libs/draco/gltf/` into `public/draco/`, and call `dracoLoader.setDecoderPath('/draco/')`.
6. **Verify:** load `public/models/veyron.glb` in a bare Three.js page. Confirm that the mesh count is unchanged from the source, that the four wheel names are present, and that materials still look right (paint, glass, leather).

**Acceptance:** `veyron.glb` is 15 MB or less, the mesh count matches the source, and it renders correctly.

### Phase 1: Inspect the parts and build the manifest

**Why:** most meshes have meaningless names, and the exploded view needs to know what each part is.

1. Write `scripts/dump-parts.mjs` to output `config/parts.json` with, for every mesh: name, world-space bounding-box center and size, triangle count, and material names.
2. Build **`tools/inspector.html`**, a debug page with:
   - the model loaded and orbit controls
   - a sidebar listing every mesh, each with a visibility checkbox
   - click-to-select in the 3D view: highlight the mesh and show its name, size and material
   - a "hide all others" button and a "show all" button
   - an **assign group** dropdown for the selected mesh (groups listed in 7.2) and an **Export** button that downloads `config/groups.json` (mesh name to group)
3. Pre-fill `groups.json` automatically using the known hints in section 3 plus geometry (height tiers, distance from the centerline, size). Mark every guess `"confidence": "low"` unless it is based on a descriptive name. Do not invent confident labels for anonymous meshes.
4. **Stop and ask the owner to review in the inspector.** The owner will correct the groups. Proceed only with the reviewed `groups.json`.
5. Report: Is there an engine or full underbody? Which groups have too few parts to look good when exploded?

**Acceptance:** `groups.json` covers every mesh, and the owner has confirmed it.

### Phase 2: Scene, lighting, materials

1. Renderer: `antialias`, ACES filmic tone mapping, sRGB output, pixel ratio capped at 2 on desktop and 1.5 on mobile. Dark near-black background.
2. Lighting: `RoomEnvironment` reflections at modest intensity, a large soft key, two cool rim lights from behind, a faint fill. Soft contact shadow under the car.
3. Floor: dark, glossy and subtly reflective, fading to black at the edges. A mirrored fade or three's `Reflector` is acceptable. Keep it cheap.
4. **Normalize the model:** center it on the origin, rest the wheels at y = 0, and scale it to a fixed length (for example, 4.5 units).
5. **Materials pass** (in `materials.js`, applied by name or material-name patterns, using the groups):
   - Body paint: `MeshPhysicalMaterial` with clearcoat, high metalness, low roughness. Choose one deep, rich color with a configurable constant.
   - Glass: transparent and tinted, no heavy transmission cost.
   - Lamps: emissive with bloom-friendly intensity.
   - Tires and rubber: dark, rough. Leather: rough, subtle variation.
6. **Do not mutate shared materials across groups.** Clone a material before changing it per mesh.
7. A loading screen with a real progress bar.

**Acceptance:** a still render of the assembled car that looks premium: good reflections on the paint, visible shape from rim lights, no pure-black or blown-out areas. Provide screenshots from the front three-quarter, side and rear.

### Phase 3: Scroll engine and camera

1. A tall scroll container (about 1000vh) with a fixed canvas. Lenis for smoothing. One **master progress value from 0 to 1**, driven by ScrollTrigger, controls everything.
2. Chapters (see section 7.1) each have a start and end progress, a camera keyframe set (position, look-at target, field of view) and an easing.
3. Camera: slow dolly moves, gentle idle sway, no constant spinning.
4. Expose `window.__setProgress(p)` so any scroll state can be jumped to for testing and screenshots.
5. Chapter dots on the side for quick navigation, keyboard accessible.

**Acceptance:** scrolling forward and back is smooth and perfectly reversible. Screenshots at progress 0, 0.1, 0.3, 0.5, 0.7 and 1.0 show distinct, correct states.

### Phase 4: Exploded view

See section 7.2 to 7.4. This is the core of the project and should get the most care.

### Phase 5: Overlays and copy

HTML overlays for headlines, stats, callout cards and leader lines. See section 8 for the design and copy rules.

### Phase 6: Post-processing and polish

Bloom on lamps, vignette, fine film grain, a very subtle chromatic aberration at the edges, optional shallow depth of field in close-ups. Letterbox bars in the hero only. Adaptive quality (section 9).

### Phase 7: Accessibility, performance, QA, README

Complete the checklists in sections 9, 10 and 12. Write the README: how to run, how the explode config works, how to change copy and colors, and credits.

---

## 7. Experience specification

### 7.1 Chapters (scroll progress ranges are starting points; tune by eye)

| # | Chapter | Progress | What happens |
|---|---|---|---|
| 1 | Hero reveal | 0 - 0.10 | Dark scene. A light sweeps across the body and the car emerges from shadow. Large title. Letterbox bars open. |
| 2 | Exterior | 0.10 - 0.30 | Slow orbit from front three-quarter to side to rear. Three headline stats appear in turn. |
| 3 | Explode | 0.30 - 0.72 | Parts separate layer by layer (7.2). Each layer pauses for a callout. |
| 4 | Reassemble | 0.72 - 0.82 | Parts return in reverse order. The camera pulls back. |
| 5 | Details | 0.82 - 0.92 | Three close-ups: headlight, wheel and caliper, rear lamp. Short captions. |
| 6 | Call to action | 0.92 - 1.00 | Car in a hero pose. CTA ("Explore" or "Reserve", clearly fictional), optional paint color switcher, footer with the disclaimer and credits. |

### 7.2 Explode groups and order

Groups, from the outermost layer to the innermost:

1. `body_panels` (doors, hood, trunk, bumpers, spoiler, paint-material parts and the large shell)
2. `glass_and_lights`
3. `interior` (seats, dashboard, steering wheel, console, stitching, gauges)
4. `mechanical` (chassis, cooler, and the placeholder powertrain if added)
5. `brakes` (calipers)
6. `wheels` (the four wheel assemblies)
7. `misc` (anything unresolved; keep still or move a little)

Order of motion: body panels lift and move outward first, then glass and lights, then interior rises, then the mechanical layer stays low as the reference, while wheels slide outward along the X axis and brakes follow.

### 7.3 How the exploded view works (data-driven)

- On load, store each mesh's **rest position**.
- `config/explode.json` defines, for each group: `direction` (a vector in model space), `distance` (as a multiple of the car's height or width, so it scales with normalization), `start` and `end` (progress within the explode chapter) for stagger, and `ease`.
- Each frame: `mesh.position = rest + direction * distance * ease(localProgress)`.
- **Translation only** for the explosion. If a part needs to rotate (for example, a slow wheel spin), wrap it in a pivot `Group` placed at the mesh's bounding-box center. Do not assume the mesh's own origin is meaningful.
- Add a small random-but-seeded per-part jitter (a few percent of the distance) so layers feel organic and not rigid.
- **Focus effect for callouts:** while a group's callout is active, fade other groups to about 10-15% opacity (use cloned materials, `depthWrite` off while faded), glow the active group slightly (emissive pulse or an outline effect), and move the camera to frame it.
- **Leader lines:** a thin line from a 3D anchor point on the active group (its bounding-box center or a chosen mesh) to its label card, projected to screen space every frame.

### 7.4 Placeholder internals

If Phase 1 finds no engine or full chassis, build a **procedural placeholder** so the mechanical layer has something to show:
- A simple powertrain: two angled banks of boxes with cylinders, plus a few pipes, in dark metal and brushed-silver materials.
- A flat chassis frame and two subframe rails under the cabin.
- Place it behind the seats and ahead of the rear axle, inside the car's bounding box, and size it to fit.
- Mark it clearly in the code as an "artistic placeholder". Do not label it with real specifications in the copy.

---

## 8. Design and copy

- **Mood:** premium, dark, restrained, like a luxury launch film. Near-black background, graphite surfaces, one cool accent (for example, ice blue), plus white text.
- **Type:** a wide, confident display face for headlines and a clean sans for body (web fonts allowed). Large type, generous spacing, short lines.
- **Motion:** slow and eased. No bouncy or playful effects. Letterbox bars and film grain only where noted.
- **Copy rules:** short and evocative. Put **all text and numbers in `src/content.js`**. Any specification number (speed, power, range) must be marked `// PLACEHOLDER` in the file and must not be presented as official data. The owner will replace or remove them.
- **Callouts needed:** Body, Cabin, Powertrain and chassis, Brakes and wheels, Lighting. Each has a title, 1-2 lines of copy and one headline figure (placeholder).
- **Footer:** "Fan-made concept. Not affiliated with, endorsed by or sponsored by any automobile manufacturer. 3D model credit: [author], via CGTrader." The author and license details are filled in by the owner.

## 9. Performance requirements

- Optimized GLB: **15 MB or less**. Initial JS plus CSS under about 400 KB gzipped, excluding the model and decoder.
- Desktop (mid-range laptop GPU): steady 60 fps through the exploded view.
- Mobile: aim for 30 fps or better. Use pixel ratio 1.5 or lower, no depth of field, lighter bloom, no film grain.
- **Adaptive quality:** measure frame time. If the average falls below about 40 fps, step down in order: pixel ratio, then depth of field, then bloom resolution, then shadows.
- No per-frame object allocation in the render loop. Dispose of unused resources. Pre-compile shaders (`renderer.compile`) during loading so the first scroll does not stutter.
- Pause rendering when the tab is hidden.

## 10. Accessibility and fallbacks

- Respect `prefers-reduced-motion`: replace scrubbed camera and explode motion with simple chapter-by-chapter jumps or fades.
- All text overlays meet WCAG AA contrast over the scene (add a subtle scrim behind text if needed).
- Chapter navigation works by keyboard. Callouts use an `aria-live` region so screen readers get the text.
- The canvas has an `aria-label`. The page has a meaningful `<title>` and meta description.
- If WebGL is unavailable or the model fails to load, show a graceful static fallback with the text content and an error message, never a blank screen.

## 11. Legal and credits

- The model is a third-party asset from CGTrader. The owner will confirm the license terms. The project is **personal and non-commercial**.
- The model carries manufacturer logos (`bugatti_logo*`). Add a config flag `SHOW_LOGOS` (default true) that hides those meshes if the owner wants a neutral look.
- Include the disclaimer and credit line in the footer (section 8). Do not use official manufacturer marketing text, trademarks or imagery beyond what is in the model.

## 12. Working rules for the agent

1. **One mission per task.** Finish and verify before moving on.
2. **Verify in the browser.** After each phase, run the dev server and send screenshots. Use `window.__setProgress(p)` for scroll-state shots.
3. **Never modify** `source/cars_clean.glb`, and never merge, rename or flatten meshes.
4. **Ask before** adding dependencies, changing the stack, or deviating from this document.
5. **Stop at the Phase 1 review** and wait for the owner's confirmed `groups.json`.
6. **Keep numbers in config.** Explode distances, camera keyframes, colors and copy must be editable without touching logic code.
7. Commit to git after each phase with a clear message.
8. Report plainly when something does not work or looks wrong. Do not paper over it.

## 13. Definition of done

- [ ] `veyron.glb` is 15 MB or less, with all meshes intact (Phase 0)
- [ ] `groups.json` reviewed and confirmed by the owner (Phase 1)
- [ ] The assembled car looks premium in stills from three angles (Phase 2)
- [ ] Scroll is smooth and fully reversible, with all six chapters distinct (Phase 3)
- [ ] The exploded view separates in clean layers with focus, glow and leader lines (Phase 4)
- [ ] All copy lives in `content.js`, with placeholder numbers flagged (Phase 5)
- [ ] Bloom, vignette and grain are applied, with adaptive quality working (Phase 6)
- [ ] Reduced-motion mode, keyboard navigation and the WebGL fallback work (Phase 7)
- [ ] Mobile test passes at 30 fps or better, and the footer disclaimer and credits are present
- [ ] README explains setup, configuration and credits
- [ ] A production build runs (`npm run build`) and can be deployed to a static host (Vercel, Netlify or GitHub Pages)

## 14. Open questions for the owner

1. Is this a Veyron, a Chiron or another model? The file includes parts named for a different car. Confirm what the title should say.
2. Which paint color should be the default?
3. Do you want the logo meshes shown or hidden?
4. Should the call to action be "Reserve" (fictional) or a link to your portfolio?
