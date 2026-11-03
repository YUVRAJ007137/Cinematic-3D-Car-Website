import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
  DepthOfFieldEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  NoiseEffect,
  BlendFunction,
  EffectPass
} from 'postprocessing';

/**
 * Cinematic Post-Processing Pipeline & Adaptive Quality Monitor
 * (PRD Phase 6 & Section 9)
 *
 * Effects:
 * 1. Selective HDR Bloom on Headlights & Taillights
 * 2. Dynamic Depth of Field (DoF) with Target Focus for Macro Detail Shots
 * 3. Subtle Edge Chromatic Aberration
 * 4. 35mm Fine Film Grain
 * 5. Cinematic Vignette
 * 6. Multi-tier Adaptive Performance Monitoring
 */

export function setupPostProcessing(renderer, scene, camera) {
  const isMobile = window.innerWidth <= 768;

  // Initialize Composer with HalfFloat for HDR fidelity
  const composer = new EffectComposer(renderer, {
    multisampling: isMobile ? 0 : 4,
    frameBufferType: THREE.HalfFloatType
  });

  // Base Render Pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 1. Bloom — tuned specifically for LED glows, crystal reflectors, and taillights
  const bloomEffect = new BloomEffect({
    luminanceThreshold: 0.72,
    luminanceSmoothing: 0.3,
    intensity: isMobile ? 0.75 : 1.35,
    mipmapBlur: true
  });

  // 2. Depth of Field (DoF) — dynamic bokeh on close-up detail shots
  let depthOfFieldEffect = null;
  if (!isMobile) {
    depthOfFieldEffect = new DepthOfFieldEffect(camera, {
      focusDistance: 0.02,
      focalLength: 0.08,
      bokehScale: 0.0 // Starts at 0 (sharp), dynamically increased in Chapter 5
    });
  }

  // 3. Chromatic Aberration — edge-only lens dispersion
  const chromaticAberrationEffect = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.0007, 0.0004),
    radialModulation: true,
    modulationOffset: 0.45
  });

  // 4. Fine 35mm Film Grain
  const noiseEffect = new NoiseEffect({
    blendFunction: BlendFunction.SOFT_LIGHT,
    premultiply: false
  });
  noiseEffect.blendMode.opacity.value = isMobile ? 0.0 : 0.075;

  // 5. Cinematic Vignette
  const vignetteEffect = new VignetteEffect({
    eskil: false,
    offset: 0.28,
    darkness: 0.58
  });

  // Combine into single consolidated effect pass
  const effects = [
    bloomEffect,
    chromaticAberrationEffect,
    noiseEffect,
    vignetteEffect
  ];

  if (depthOfFieldEffect) {
    effects.unshift(depthOfFieldEffect);
  }

  const effectPass = new EffectPass(camera, ...effects);
  composer.addPass(effectPass);

  // Resize handler
  function setSize(width, height) {
    composer.setSize(width, height);
  }

  /**
   * Sets dynamic Depth of Field focus target & bokeh intensity
   */
  function setDoFState(targetVec3, bokehAmount) {
    if (!depthOfFieldEffect) return;
    if (targetVec3) {
      depthOfFieldEffect.target = targetVec3;
    }
    depthOfFieldEffect.bokehScale = bokehAmount;
  }

  // Adaptive Quality Monitor (PRD Section 9)
  let qualityTier = 3;
  let frameCount = 0;
  let lastTime = performance.now();
  let startupGracePeriod = performance.now() + 3000; // Ignore first 3s while loading/compiling
  let fpsHistory = [];

  function monitorQuality(now) {
    if (now < startupGracePeriod) {
      lastTime = now;
      frameCount = 0;
      return;
    }

    frameCount++;
    const delta = now - lastTime;

    if (delta >= 1000) {
      const currentFps = (frameCount * 1000) / delta;
      fpsHistory.push(currentFps);
      if (fpsHistory.length > 5) fpsHistory.shift();

      const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;

      if (avgFps < 38 && qualityTier > 1) {
        qualityTier--;
        console.warn(`[AdaptiveQuality] FPS ${avgFps.toFixed(1)} → Tier ${qualityTier}`);
        applyQualityTier(qualityTier);
      }

      frameCount = 0;
      lastTime = now;
    }
  }

  function applyQualityTier(tier) {
    if (tier === 2) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      bloomEffect.intensity = 0.85;
      noiseEffect.blendMode.opacity.value = 0.0;
      if (depthOfFieldEffect) depthOfFieldEffect.bokehScale = 0.0;
    } else if (tier === 1) {
      renderer.setPixelRatio(1.0);
      chromaticAberrationEffect.blendMode.opacity.value = 0.0;
      bloomEffect.intensity = 0.5;
      renderer.shadowMap.enabled = false;
      if (depthOfFieldEffect) depthOfFieldEffect.bokehScale = 0.0;
    }
  }

  return {
    composer,
    bloomEffect,
    depthOfFieldEffect,
    chromaticAberrationEffect,
    noiseEffect,
    vignetteEffect,
    setSize,
    setDoFState,
    monitorQuality
  };
}
