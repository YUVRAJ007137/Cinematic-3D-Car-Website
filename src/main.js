import * as THREE from 'three';
import { createScene } from './scene.js';
import { loadCarModel } from './loader.js';
import { setupMaterials } from './materials.js';
import { ExplodeController } from './explode.js';
import { setupPostProcessing } from './post.js';
import { OverlayController } from './overlay.js';
import { TimelineController } from './timeline.js';

/**
 * Cinematic 3D Car Website — Main Orchestrator
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

  // 3. Initialize Scene, Lighting, Camera, Ground Reflector
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

  function updateLoaderProgress(pct) {
    const val = Math.min(100, Math.round(pct));
    if (barFill) barFill.style.width = `${val}%`;
    if (percentEl) percentEl.innerText = `${val}%`;
  }

  // 5. Load 3D Vehicle Model with Progress Bar
  let carData;
  try {
    carData = await loadCarModel((pct) => {
      // Scale load progress to 0-85%
      updateLoaderProgress(pct * 0.85);
    });
  } catch (err) {
    console.error('Failed to load 3D model:', err);
    return;
  }

  const { carContainer, root: modelRoot } = carData;
  scene.add(carContainer);

  // 6. Upgraded PBR Materials Pass
  setupMaterials(modelRoot, groupsData);

  // 7. Exploded View Engine
  const explodeController = new ExplodeController(modelRoot, groupsData, explodeConfig);

  // 8. Post-Processing Pipeline
  const { composer, setSize: postResize, monitorQuality } = setupPostProcessing(renderer, scene, camera);

  // 9. HTML Overlays & Leader Lines
  const overlayController = new OverlayController(explodeController);

  // 10. Scroll Engine & Master Timeline
  const timelineController = new TimelineController({
    camera,
    cameraTarget,
    lights,
    explodeController,
    overlayController
  });

  // 11. Wire Chapter Navigation Dots
  document.querySelectorAll('.chapter-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index, 10);
      timelineController.scrollToChapter(idx);
    });
  });

  // 12. Pre-compile Shaders to eliminate scroll stutter (PRD Section 9)
  updateLoaderProgress(95);
  renderer.compile(scene, camera);
  updateLoaderProgress(100);

  // Hide loading screen smoothly
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.classList.add('loaded');
    }
  }, 350);

  // 13. Synchronize Resize Handlers
  window.addEventListener('resize', () => {
    sceneResize();
    postResize(window.innerWidth, window.innerHeight);
  });

  // 14. Render Loop with Tab Visibility Pause (PRD Section 9)
  let isTabVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
  });

  // Pre-allocated vectors for camera sway — no per-frame allocation
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
    if (!isTabVisible) return;

    const dt = 0.016; // ~60fps delta
    elapsed += dt;

    // Monitor FPS & adapt quality
    monitorQuality(now);

    // Animate atmospheric dust particles
    if (particleMaterial) {
      particleMaterial.uniforms.uTime.value = elapsed;
    }

    // Subtle breathing camera sway — applied temporarily, not accumulated
    const swayX = Math.sin(elapsed * 0.5) * 0.012;
    const swayY = Math.cos(elapsed * 0.35) * 0.006;
    swayOffset.set(swayX, swayY, 0);

    camera.position.add(swayOffset);
    camera.lookAt(cameraTarget);
    camera.position.sub(swayOffset);

    // Render post-processing chain
    composer.render();
  }

  requestAnimationFrame(renderLoop);

  // Initialize first frame at scroll 0
  timelineController.setProgress(0);
}

// Start application
window.addEventListener('DOMContentLoaded', main);
