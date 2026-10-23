import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
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
 * Effects: Bloom on emissives, cinematic vignette, fine film grain,
 * subtle edge chromatic aberration, adaptive quality stepping.
 */

export function setupPostProcessing(renderer, scene, camera) {
  const isMobile = window.innerWidth <= 768;

  // Initialize Composer with half-float for HDR bloom
  const composer = new EffectComposer(renderer, {
    multisampling: isMobile ? 0 : 4,
    frameBufferType: THREE.HalfFloatType
  });

  // Base Render Pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 1. Bloom — tuned for lamp glow, not general brightness
  const bloomEffect = new BloomEffect({
    luminanceThreshold: 0.78,
    luminanceSmoothing: 0.25,
    intensity: isMobile ? 0.7 : 1.2,
    mipmapBlur: true
  });

  // 2. Chromatic Aberration — very subtle edge-only
  const chromaticAberrationEffect = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.0006, 0.0003),
    radialModulation: true,
    modulationOffset: 0.4
  });

  // 3. Film Grain — fine cinematic grain (PRD: "fine film grain")
  const noiseEffect = new NoiseEffect({
    blendFunction: BlendFunction.SOFT_LIGHT,
    premultiply: false
  });
  // Set grain intensity: subtle on desktop, off on mobile
  noiseEffect.blendMode.opacity.value = isMobile ? 0.0 : 0.08;

  // 4. Cinematic Vignette — dark edges, film feel
  const vignetteEffect = new VignetteEffect({
    eskil: false,
    offset: 0.28,
    darkness: 0.58
  });

  // Combine into single efficient pass
  const effectPass = new EffectPass(
    camera,
    bloomEffect,
    chromaticAberrationEffect,
    noiseEffect,
    vignetteEffect
  );
  composer.addPass(effectPass);

  // Resize handler
  function setSize(width, height) {
    composer.setSize(width, height);
  }

  // Adaptive Quality Monitor (PRD Section 9)
  let qualityTier = 3; // 3: High, 2: Medium, 1: Low
  let frameCount = 0;
  let lastTime = performance.now();
  let fpsHistory = [];

  function monitorQuality(now) {
    frameCount++;
    const delta = now - lastTime;

    if (delta >= 1000) {
      const currentFps = (frameCount * 1000) / delta;
      fpsHistory.push(currentFps);
      if (fpsHistory.length > 5) fpsHistory.shift();

      const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;

      // Step down if sustained low FPS
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
      // Step 1: Lower pixel ratio, reduce bloom
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      bloomEffect.intensity = 0.8;
      noiseEffect.blendMode.opacity.value = 0.0; // Disable grain
    } else if (tier === 1) {
      // Step 2: Minimal quality
      renderer.setPixelRatio(1.0);
      chromaticAberrationEffect.blendMode.opacity.value = 0.0;
      bloomEffect.intensity = 0.5;
      renderer.shadowMap.enabled = false;
    }
  }

  return {
    composer,
    bloomEffect,
    chromaticAberrationEffect,
    noiseEffect,
    vignetteEffect,
    setSize,
    monitorQuality
  };
}
