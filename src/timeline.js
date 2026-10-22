import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll Timeline Engine
 * Coordinates Lenis smooth scrolling, master progress scrubbing [0, 1],
 * camera spline interpolation, and chapter dispatch.
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

    this.cameraKeyframes = [
      // Chapter 1: Hero Reveal (0 - 0.10)
      { p: 0.00, pos: [3.4, 0.85, 3.6], target: [0, 0.38, 0.1], fov: 35 },
      { p: 0.10, pos: [3.2, 1.25, 3.2], target: [0, 0.42, 0.0], fov: 36 },

      // Chapter 2: Exterior Orbit (0.10 - 0.30)
      { p: 0.18, pos: [4.1, 1.15, 1.4], target: [0, 0.45, 0.0], fov: 37 },
      { p: 0.25, pos: [3.8, 1.10, -1.2], target: [0, 0.45, 0.0], fov: 37 },
      { p: 0.30, pos: [2.6, 1.35, -2.8], target: [0, 0.48, -0.2], fov: 38 },

      // Chapter 3: Exploded View (0.30 - 0.72)
      // Layer 1: Body
      { p: 0.36, pos: [3.0, 1.90, 2.6], target: [0, 0.78, 0.2], fov: 36 },
      // Layer 2: Glass & Lights
      { p: 0.43, pos: [2.2, 1.60, 2.8], target: [0.3, 0.68, 0.9], fov: 35 },
      // Layer 3: Cockpit Interior
      { p: 0.50, pos: [1.8, 1.75, 1.3], target: [0.0, 0.62, 0.1], fov: 34 },
      // Layer 4: Mechanical & Powertrain
      { p: 0.58, pos: [-2.2, 1.35, -1.5], target: [0.0, 0.42, -0.4], fov: 35 },
      // Layer 5: Brakes
      { p: 0.65, pos: [2.4, 0.85, 1.6], target: [0.72, 0.35, 1.1], fov: 33 },
      // Layer 6: Wheels
      { p: 0.72, pos: [2.8, 0.95, 1.7], target: [0.85, 0.35, 1.1], fov: 34 },

      // Chapter 4: Reassemble (0.72 - 0.82)
      { p: 0.77, pos: [3.5, 1.50, 2.8], target: [0, 0.45, 0], fov: 37 },
      { p: 0.82, pos: [3.6, 1.30, 3.2], target: [0, 0.45, 0], fov: 38 },

      // Chapter 5: Detail Shots (0.82 - 0.92)
      // Headlight Detail
      { p: 0.85, pos: [1.3, 0.75, 2.2], target: [0.55, 0.52, 1.65], fov: 28 },
      // Wheel Aero Blade Detail
      { p: 0.88, pos: [1.6, 0.48, 1.4], target: [0.82, 0.35, 1.2], fov: 26 },
      // Tail Light Blade Detail
      { p: 0.92, pos: [-0.4, 0.85, -2.4], target: [0, 0.72, -1.8], fov: 28 },

      // Chapter 6: CTA & Final Pose (0.92 - 1.00)
      { p: 1.00, pos: [3.3, 1.15, 3.1], target: [0, 0.42, 0.1], fov: 36 }
    ];

    this.initLenis();
    this.initScrollTrigger();
    this.setupGlobalTestingHook();
  }

  initLenis() {
    this.lenis = new Lenis({
      duration: 1.2,
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
      scrub: 1.0,
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
    // Find surrounding keyframe segments
    const frames = this.cameraKeyframes;
    let i = 0;
    while (i < frames.length - 1 && frames[i + 1].p < p) {
      i++;
    }

    const f1 = frames[i];
    const f2 = frames[Math.min(i + 1, frames.length - 1)];

    const span = Math.max(f2.p - f1.p, 0.0001);
    const alpha = Math.max(0, Math.min(1, (p - f1.p) / span));

    // Smooth cubic interpolation
    const easeAlpha = alpha * alpha * (3 - 2 * alpha);

    // Interpolate camera position
    this.camera.position.x = f1.pos[0] + (f2.pos[0] - f1.pos[0]) * easeAlpha;
    this.camera.position.y = f1.pos[1] + (f2.pos[1] - f1.pos[1]) * easeAlpha;
    this.camera.position.z = f1.pos[2] + (f2.pos[2] - f1.pos[2]) * easeAlpha;

    // Interpolate target lookAt
    this.cameraTarget.x = f1.target[0] + (f2.target[0] - f1.target[0]) * easeAlpha;
    this.cameraTarget.y = f1.target[1] + (f2.target[1] - f1.target[1]) * easeAlpha;
    this.cameraTarget.z = f1.target[2] + (f2.target[2] - f1.target[2]) * easeAlpha;
    this.camera.lookAt(this.cameraTarget);

    // Interpolate field of view
    const targetFov = f1.fov + (f2.fov - f1.fov) * easeAlpha;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }
  }

  updateChapterDynamics(p) {
    const { heroSweepLight, keyLight } = this.lights;

    // Chapter 1: Hero Reveal (0 - 0.10)
    if (p <= 0.10) {
      const heroT = p / 0.10;
      // Light sweep across body
      heroSweepLight.intensity = Math.sin(heroT * Math.PI) * 12.0;
      heroSweepLight.position.x = -4.0 + heroT * 8.0;
      keyLight.intensity = 0.5 + heroT * 1.7;

      // Unexploded
      this.explode.update(0);
      this.explode.setFocusGroup(null);
    }
    // Chapter 2: Exterior (0.10 - 0.30)
    else if (p > 0.10 && p <= 0.30) {
      heroSweepLight.intensity = 0.0;
      keyLight.intensity = 2.2;
      this.explode.update(0);
      this.explode.setFocusGroup(null);
    }
    // Chapter 3: Exploded View (0.30 - 0.72)
    else if (p > 0.30 && p <= 0.72) {
      heroSweepLight.intensity = 0.0;
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
    // Chapter 5 & 6: Details & CTA (0.82 - 1.0)
    else {
      this.explode.update(0);
      this.explode.setFocusGroup(null);
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
