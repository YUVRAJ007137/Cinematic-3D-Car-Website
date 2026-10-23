import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll Timeline Engine — Cinematic Camera Path
 * Lenis smooth scrolling → master progress [0, 1] → camera spline + lighting + scene state
 */

export class TimelineController {
  constructor({ camera, cameraTarget, lights, explodeController, overlayController }) {
    this.camera = camera;
    this.cameraTarget = cameraTarget;
    this.lights = lights;
    this.explode = explodeController;
    this.overlay = overlayController;

    this.masterProgress = 0;
    this.currentChapterIndex = 0;
    this.lenis = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Cinematic camera keyframes — slow, sweeping, filmic moves
    this.cameraKeyframes = [
      // Chapter 1: Hero Reveal (0 - 0.10) — dramatic low angle emergence
      { p: 0.00, pos: [4.0, 0.7, 4.2],  target: [0, 0.35, 0.2], fov: 32 },
      { p: 0.05, pos: [3.6, 0.9, 3.8],  target: [0, 0.38, 0.1], fov: 33 },
      { p: 0.10, pos: [3.3, 1.15, 3.4], target: [0, 0.42, 0.0], fov: 35 },

      // Chapter 2: Exterior Orbit (0.10 - 0.30) — slow sweeping reveal
      { p: 0.15, pos: [4.2, 1.1, 2.0],  target: [0, 0.42, 0.0], fov: 36 },
      { p: 0.20, pos: [4.0, 1.05, 0.0], target: [0, 0.45, 0.0], fov: 37 },
      { p: 0.25, pos: [3.5, 1.1, -1.8], target: [0, 0.45, -0.1], fov: 37 },
      { p: 0.30, pos: [2.4, 1.3, -3.0], target: [0, 0.48, -0.2], fov: 38 },

      // Chapter 3: Exploded View (0.30 - 0.72)
      // Body panels lift
      { p: 0.36, pos: [3.2, 2.0, 2.8],  target: [0, 0.8, 0.2],   fov: 36 },
      // Glass & lights
      { p: 0.43, pos: [2.4, 1.65, 3.0], target: [0.3, 0.7, 0.9],  fov: 35 },
      // Interior cockpit
      { p: 0.50, pos: [1.9, 1.8, 1.5],  target: [0.0, 0.65, 0.1], fov: 34 },
      // Mechanical/powertrain
      { p: 0.58, pos: [-2.4, 1.4, -1.6], target: [0.0, 0.42, -0.4], fov: 35 },
      // Brakes
      { p: 0.65, pos: [2.5, 0.9, 1.7],  target: [0.72, 0.35, 1.1], fov: 33 },
      // Wheels
      { p: 0.72, pos: [2.9, 1.0, 1.8],  target: [0.85, 0.35, 1.1], fov: 34 },

      // Chapter 4: Reassemble (0.72 - 0.82) — pull back elegantly
      { p: 0.77, pos: [3.6, 1.5, 3.0],  target: [0, 0.45, 0], fov: 37 },
      { p: 0.82, pos: [3.8, 1.3, 3.4],  target: [0, 0.42, 0], fov: 38 },

      // Chapter 5: Detail Shots (0.82 - 0.92) — tight close-ups
      // Headlight detail
      { p: 0.85, pos: [1.2, 0.72, 2.3], target: [0.55, 0.52, 1.65], fov: 26 },
      // Wheel detail
      { p: 0.88, pos: [1.5, 0.45, 1.5], target: [0.82, 0.35, 1.2], fov: 24 },
      // Tail light detail
      { p: 0.92, pos: [-0.3, 0.8, -2.5], target: [0, 0.72, -1.8], fov: 26 },

      // Chapter 6: CTA — final hero pose
      { p: 1.00, pos: [3.5, 1.1, 3.3], target: [0, 0.40, 0.1], fov: 35 }
    ];

    this.initLenis();
    this.initScrollTrigger();
    this.setupGlobalTestingHook();
  }

  initLenis() {
    this.lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });

    this.lenis.on('scroll', ScrollTrigger.update);

    // Sync Lenis with GSAP ticker
    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  initScrollTrigger() {
    const scrollContainer = document.getElementById('scroll-container');

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2, // Slightly more inertia for cinematic feel
      onUpdate: (self) => {
        this.setProgress(self.progress);
      }
    });
  }

  /**
   * Sets master progress [0, 1] and updates all scene and overlay elements
   */
  setProgress(progress) {
    this.masterProgress = Math.max(0, Math.min(1, progress));

    // 1. Interpolate Camera Keyframes
    this.updateCamera(this.masterProgress);

    // 2. Drive Chapter-specific scene dynamics
    this.updateChapterDynamics(this.masterProgress);

    // 3. Update HTML Overlays & Leader Lines
    if (this.overlay) {
      this.overlay.update(this.masterProgress, this.camera);
    }
  }

  updateCamera(p) {
    // Find surrounding keyframe pair
    const frames = this.cameraKeyframes;
    let i = 0;
    while (i < frames.length - 1 && frames[i + 1].p < p) {
      i++;
    }

    const f1 = frames[i];
    const f2 = frames[Math.min(i + 1, frames.length - 1)];

    const span = Math.max(f2.p - f1.p, 0.0001);
    const alpha = Math.max(0, Math.min(1, (p - f1.p) / span));

    // Smooth Hermite interpolation for cinematic smoothness
    const t = alpha;
    const easeAlpha = t * t * t * (t * (t * 6 - 15) + 10); // Quintic smoothstep

    // Interpolate position
    this.camera.position.x = f1.pos[0] + (f2.pos[0] - f1.pos[0]) * easeAlpha;
    this.camera.position.y = f1.pos[1] + (f2.pos[1] - f1.pos[1]) * easeAlpha;
    this.camera.position.z = f1.pos[2] + (f2.pos[2] - f1.pos[2]) * easeAlpha;

    // Interpolate lookAt target
    this.cameraTarget.x = f1.target[0] + (f2.target[0] - f1.target[0]) * easeAlpha;
    this.cameraTarget.y = f1.target[1] + (f2.target[1] - f1.target[1]) * easeAlpha;
    this.cameraTarget.z = f1.target[2] + (f2.target[2] - f1.target[2]) * easeAlpha;
    this.camera.lookAt(this.cameraTarget);

    // Interpolate FOV
    const targetFov = f1.fov + (f2.fov - f1.fov) * easeAlpha;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }
  }

  updateChapterDynamics(p) {
    const { heroSweepLight, keyLight, rimLightLeft, underGlow } = this.lights;

    // Chapter 1: Hero Reveal (0 - 0.10)
    if (p <= 0.10) {
      const heroT = p / 0.10;

      // Dramatic light sweep across the body — starts dark, sweeps across
      heroSweepLight.intensity = Math.sin(heroT * Math.PI) * 15.0;
      heroSweepLight.position.x = -5.0 + heroT * 10.0;
      heroSweepLight.position.z = 4.0 - heroT * 2.0;

      // Key light builds up from darkness
      keyLight.intensity = 0.2 + heroT * 1.6;

      // Rim lights subtly increase
      rimLightLeft.intensity = heroT * 1.4;

      // Under-glow pulses in
      if (underGlow) underGlow.intensity = heroT * 0.8;

      // Car fully assembled
      this.explode.update(0);
      this.explode.setFocusGroup(null);
    }
    // Chapter 2: Exterior Orbit (0.10 - 0.30)
    else if (p > 0.10 && p <= 0.30) {
      heroSweepLight.intensity = 0.0;
      keyLight.intensity = 1.8;
      rimLightLeft.intensity = 1.4;
      if (underGlow) underGlow.intensity = 0.8;

      this.explode.update(0);
      this.explode.setFocusGroup(null);
    }
    // Chapter 3: Exploded View (0.30 - 0.72)
    else if (p > 0.30 && p <= 0.72) {
      heroSweepLight.intensity = 0.0;
      keyLight.intensity = 1.8;

      const explodeT = (p - 0.30) / (0.72 - 0.30);
      this.explode.update(explodeT);

      // Determine active callout focus group
      let activeGroup = null;
      if (explodeT < 0.18) activeGroup = 'body_panels';
      else if (explodeT < 0.35) activeGroup = 'glass_and_lights';
      else if (explodeT < 0.52) activeGroup = 'interior';
      else if (explodeT < 0.70) activeGroup = 'mechanical';
      else if (explodeT < 0.85) activeGroup = 'brakes';
      else activeGroup = 'wheels';

      this.explode.setFocusGroup(activeGroup);
    }
    // Chapter 4: Reassemble (0.72 - 0.82)
    else if (p > 0.72 && p <= 0.82) {
      const reassembleT = 1.0 - (p - 0.72) / (0.82 - 0.72);
      this.explode.update(reassembleT);
      this.explode.setFocusGroup(null);
    }
    // Chapter 5: Detail Shots (0.82 - 0.92)
    else if (p > 0.82 && p <= 0.92) {
      this.explode.update(0);
      this.explode.setFocusGroup(null);

      // Slightly tighter lighting for close-ups
      keyLight.intensity = 2.0;
      rimLightLeft.intensity = 2.5;
    }
    // Chapter 6: CTA & Final Pose (0.92 - 1.00)
    else {
      this.explode.update(0);
      this.explode.setFocusGroup(null);
      keyLight.intensity = 1.8;
      rimLightLeft.intensity = 2.2;
    }
  }

  /**
   * PRD 6.3 & 12.2 Requirement: Expose window.__setProgress(p)
   */
  setupGlobalTestingHook() {
    window.__setProgress = (p) => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const targetScroll = p * scrollHeight;
      if (this.lenis) {
        this.lenis.scrollTo(targetScroll, { immediate: true });
      } else {
        window.scrollTo(0, targetScroll);
      }
      this.setProgress(p);
      console.log(`[TestingHook] Master progress scrubbed to ${p.toFixed(3)}`);
    };
  }

  scrollToChapter(index) {
    const chapterOffsets = [0.0, 0.18, 0.45, 0.75, 0.86, 0.98];
    const targetP = chapterOffsets[index] ?? 0;
    window.__setProgress(targetP);
  }
}
