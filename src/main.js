import * as THREE from 'three';
import { createScene } from './scene.js';
import { loadCarModel } from './loader.js';
import { setupMaterials, animateEmissives } from './materials.js';
import { ExplodeController } from './explode.js';
import { setupPostProcessing } from './post.js';
import { OverlayController } from './overlay.js';
import { TimelineController } from './timeline.js';
import { audioManager } from './audio.js';
import { HotspotManager } from './hotspots.js';
import { teardownScene } from './dispose.js';
import { LensCursor } from './cursor.js';

/**
 * Cinematic 3D Car Website — Main Orchestrator
 * Integrates high-end PBR materials, softbox PMREM lighting, planar reflections,
 * dynamic DoF, interactive 360° orbit, procedural automotive textures,
 * spatial audio, interactive raycast hotspots, and teardown disposers.
 */

async function main() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  // 1. Check WebGL 2.0 availability
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) {
    const errFallback = document.getElementById('webgl-error-fallback');
    if (errFallback) errFallback.style.display = 'flex';
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    return;
  }

  // 2. Fetch Manifest Configurations
  let groupsData = {};
  let explodeConfig = {};
  try {
    const [gRes, eRes] = await Promise.all([
      fetch('/config/groups.json'),
      fetch('/config/explode.json')
    ]);
    if (gRes.ok) groupsData = await gRes.json();
    if (eRes.ok) explodeConfig = await eRes.json();
  } catch (err) {
    console.warn('Config fetch warning:', err);
  }

  // 3. Initialize Scene, Studio Lighting, Camera, Ground Reflector
  const {
    scene,
    camera,
    cameraTarget,
    renderer,
    lights,
    onResize: sceneResize
  } = createScene(canvas);

  // 4. Loading Bar elements
  const loadingScreen = document.getElementById('loading-screen');
  const barFill = document.getElementById('loader-bar-fill');
  const percentEl = document.getElementById('loader-percent');
  const statusTextEl = document.getElementById('loader-status-text');

  function updateLoaderProgress(pct, statusNote) {
    const val = Math.min(100, Math.round(pct));
    if (barFill) barFill.style.width = `${val}%`;
    if (percentEl) percentEl.innerText = `${val}%`;
    if (statusTextEl && statusNote) statusTextEl.innerText = statusNote;
  }

  updateLoaderProgress(15, 'Streaming Draco geometry...');

  // 5. Load 3D Vehicle Model with Progress Bar
  let carData;
  try {
    carData = await loadCarModel((pct) => {
      updateLoaderProgress(15 + pct * 0.70, `Streaming 3D geometry... ${Math.round(pct)}%`);
    });
  } catch (err) {
    console.error('Failed to load 3D model:', err);
    return;
  }

  const { carContainer, root: modelRoot } = carData;
  scene.add(carContainer);

  updateLoaderProgress(88, 'Synthesizing PBR procedural shaders...');

  // 6. Upgraded PBR Materials Pass with Procedural Automotive Shaders
  setupMaterials(modelRoot, groupsData);

  // 7. Exploded View Engine
  const explodeController = new ExplodeController(modelRoot, groupsData, explodeConfig);

  // 8. Post-Processing Pipeline with Dynamic Depth of Field
  const postController = setupPostProcessing(renderer, scene, camera);
  const { composer, setSize: postResize, monitorQuality } = postController;

  // 9. HTML Overlays & Leader Lines
  const overlayController = new OverlayController(explodeController);

  // 10. Scroll Engine & Master Timeline
  const timelineController = new TimelineController({
    camera,
    cameraTarget,
    lights,
    explodeController,
    overlayController,
    postController,
    carContainer,
    canvas,
    scene
  });

  // 11. Interactive Hotspots System
  const hotspotManager = new HotspotManager(scene, camera, canvas, carContainer);

  // 12. Audio Manager & Lens Reticle Cursor Setup
  audioManager.setupUI();
  const lensCursor = new LensCursor();

  // 13. Wire Chapter Navigation Dots
  document.querySelectorAll('.chapter-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index, 10);
      timelineController.scrollToChapter(idx);
    });
  });

  // 14. Pre-compile Shaders to eliminate scroll stutter (PRD Section 9)
  updateLoaderProgress(95, 'Compiling WebGL pipelines...');
  renderer.compile(scene, camera);
  updateLoaderProgress(100, 'Igniting experience.');

  // Smoothly reveal showroom
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.classList.add('loaded');
    }
  }, 400);

  // 15. Synchronize Resize Handlers
  window.addEventListener('resize', () => {
    sceneResize();
    postResize(window.innerWidth, window.innerHeight);
  });

  // 16. Render Loop with Tab Visibility & Offscreen Canvas Pause
  let isTabVisible = !document.hidden;
  let isCanvasOnScreen = true;

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isCanvasOnScreen = entry.isIntersecting;
      });
    }, { threshold: 0.05 });
    observer.observe(canvas);
  }

  // 17. Teardown & Clean Disposals
  window.addEventListener('beforeunload', () => {
    teardownScene({
      scene,
      renderer,
      composer,
      controls: timelineController.controls,
      lenis: timelineController.lenis
    });
  });

  const swayOffset = new THREE.Vector3();
  let elapsed = 0;

  // Find particle material for animation
  let particleMaterial = null;
  scene.traverse((child) => {
    if (child.userData.particleMaterial) {
      particleMaterial = child.userData.particleMaterial;
    }
  });

  function renderLoop(now) {
    requestAnimationFrame(renderLoop);
    if (!isTabVisible || !isCanvasOnScreen) return;

    const dt = 0.016;
    elapsed += dt;

    // Monitor FPS & adapt quality tier
    monitorQuality(now);

    // Animate daytime running LED and taillight breathing pulse
    animateEmissives(elapsed);

    // Animate atmospheric dust particles
    if (particleMaterial) {
      particleMaterial.uniforms.uTime.value = elapsed;
    }

    // Inertial heavy hydraulic camera dampening & camera rig updates
    timelineController.updateDampedCamera(dt);

    // Update 3D Hotspot pins
    hotspotManager.update(timelineController.masterProgress, camera);

    // Render post-processing chain
    composer.render();
  }

  requestAnimationFrame(renderLoop);

  // Initialize first frame at scroll 0 immediately
  timelineController.setProgress(0, true);
}

// Start application
window.addEventListener('DOMContentLoaded', main);
