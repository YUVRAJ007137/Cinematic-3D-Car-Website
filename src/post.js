import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  EffectPass
} from 'postprocessing';

/**
 * Cinematic Post-Processing Pipeline & Adaptive Quality Monitor
 * (PRD Phase 6 & Section 9)
 */

export function setupPostProcessing(renderer, scene, camera) {
  const isMobile = window.innerWidth <= 768;

  // Initialize Composer
  const composer = new EffectComposer(renderer, {
    multisampling: isMobile ? 0 : 4,
    frameBufferType: THREE.HalfFloatType
  });

  // Base Render Pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 1. Bloom on Lamps & Emissives
  const bloomEffect = new BloomEffect({
    luminanceThreshold: 0.85,
    luminanceSmoothing: 0.2,
    intensity: isMobile ? 0.8 : 1.35,
    mipmapBlur: true
  });

  // 2. Subtle Edge Chromatic Aberration
  const chromaticAberrationEffect = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.0008, 0.0004),
    radialModulation: true,
    modulationOffset: 0.35
  });

  // 3. Cinematic Film Vignette
  const vignetteEffect = new VignetteEffect({
    eskil: false,
    offset: 0.32,
    darkness: 0.52
  });

  // Combine into single efficient pass
  const effectPass = new EffectPass(
    camera,
    bloomEffect,
    chromaticAberrationEffect,
    vignetteEffect
  );
  composer.addPass(effectPass);

  // Resize handler
  function setSize(width, height) {
    composer.setSize(width, height);
  }

  // Adaptive Quality Monitor
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

      // Check degradation
      if (avgFps < 38 && qualityTier > 1) {
        qualityTier--;
        console.warn(`[Performance] FPS dropped to ${avgFps.toFixed(1)}. Stepping down to quality tier ${qualityTier}`);
        applyQualityTier(qualityTier);
      }

      frameCount = 0;
      lastTime = now;
    }
  }

  function applyQualityTier(tier) {
    if (tier === 2) {
      // Step 1: Lower pixel ratio to 1.5, reduce bloom intensity
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      bloomEffect.intensity = 0.9;
    } else if (tier === 1) {
      // Step 2: Pixel ratio 1.0, disable chromatic aberration, reduce shadows
      renderer.setPixelRatio(1.0);
      chromaticAberrationEffect.blendMode.opacity.value = 0.0;
      bloomEffect.intensity = 0.6;
      renderer.shadowMap.enabled = false;
    }
  }

  return {
    composer,
    bloomEffect,
    chromaticAberrationEffect,
    vignetteEffect,
    setSize,
    monitorQuality
  };
}
