import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import Lenis from 'lenis';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { audioManager } from './audio.js';
import { computePchipTangents, evalHermiteSpline, getChapterFromProgress } from './math-utils.js';
import { CameraRig } from './cameraRig.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll Timeline Engine — Monotone Cubic Hermite Spline (PCHIP) & Studio Hydraulic Crane Damping
 *
 * Eliminates sudden camera movements, stops, and jerks:
 * 1. CameraRig: Progress-driven position/look-at splines, independent channels, speed ramps, and debug view.
 * 2. Heavy Hydraulic Damping: Low-pass lerp filter simulates a 500lb Hollywood camera crane with fluid
 *    head damping, smoothing trackpad/mouse-wheel impulses into continuous, gliding cinematography.
 * 3. Drag-to-Orbit during Exterior chapter (with limits) and full 360° orbit at CTA.
 * 4. Lenis syncTouch mobile smooth scrolling.
 * 5. Audio transition triggers and high-velocity motion blur / speed lines.
 */

export class TimelineController {
  constructor({ camera, cameraTarget, lights, explodeController, overlayController, postController, carContainer, canvas, scene }) {
    this.camera = camera;
    this.cameraTarget = cameraTarget;
    this.lights = lights;
    this.explode = explodeController;
    this.overlay = overlayController;
    this.post = postController;
    this.carContainer = carContainer;
    this.canvas = canvas;
    this.scene = scene;

    this.masterProgress = 0;
    this.currentChapterIndex = 0;
    this.lenis = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Camera Rig Engine
    this.cameraRig = new CameraRig({
      camera: this.camera,
      scene: this.scene,
      canvas: this.canvas
    });

    // Target vectors for inertial camera dampening
    this.targetCamPos = new THREE.Vector3(0.0, 0.22, 5.8);
    this.targetCamTarget = new THREE.Vector3(0.0, 0.42, 0.5);
    this.targetFov = 28;
    this.isInitialized = false;
    this.lastChapterIndex = -1;
    this.lastProgress = 0;
    this.scrollVelocity = 0;

    // Speed Lines Canvas
    this.speedCanvas = document.getElementById('speed-lines-canvas');
    if (this.speedCanvas) {
      this.speedCtx = this.speedCanvas.getContext('2d');
      this.resizeSpeedCanvas();
      window.addEventListener('resize', () => this.resizeSpeedCanvas());
    }

    // Interactive OrbitControls for Exterior Chapter & CTA
    this.initOrbitControls();

    // Fallback keyframes reference
    this.cameraKeyframes = this.cameraRig.keyframes;

    this.initLenis();
    this.initScrollTrigger();
    this.setupGlobalTestingHook();

    window.__timeline = this;
    window.__camera = this.camera;
    window.__cameraTarget = this.cameraTarget;
    window.__scene = this.scene;
  }

  /**
   * Pre-calculates Fritsch-Carlson PCHIP tangents across all keyframe points.
   * Guarantees zero overshoot, monotonicity preservation, and smooth C1 velocity.
   */
  initCameraSpline() {
    const kfs = this.cameraKeyframes;
    const ps = kfs.map((k) => k.p);

    this.mPosX = computePchipTangents(ps, kfs.map((k) => k.pos[0]));
    this.mPosY = computePchipTangents(ps, kfs.map((k) => k.pos[1]));
    this.mPosZ = computePchipTangents(ps, kfs.map((k) => k.pos[2]));

    this.mTargetX = computePchipTangents(ps, kfs.map((k) => k.target[0]));
    this.mTargetY = computePchipTangents(ps, kfs.map((k) => k.target[1]));
    this.mTargetZ = computePchipTangents(ps, kfs.map((k) => k.target[2]));

    this.mFov = computePchipTangents(ps, kfs.map((k) => k.fov));
  }

  initOrbitControls() {
    if (!this.canvas) return;
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 7.0;
    this.controls.target.copy(this.cameraTarget);
    this.controls.enabled = false;
    this.isUserOrbiting = false;

    this.controls.addEventListener('start', () => {
      this.isUserOrbiting = true;
    });
  }

  resizeSpeedCanvas() {
    if (!this.speedCanvas) return;
    this.speedCanvas.width = window.innerWidth;
    this.speedCanvas.height = window.innerHeight;
  }

  renderSpeedLines(vel) {
    if (!this.speedCanvas || !this.speedCtx) return;
    const ctx = this.speedCtx;
    const w = this.speedCanvas.width;
    const h = this.speedCanvas.height;

    ctx.clearRect(0, 0, w, h);
    if (vel < 0.008) return;

    const alpha = Math.min(0.45, (vel - 0.008) * 25);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.2;

    const cx = w * 0.5;
    const cy = h * 0.5;
    const count = 18;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.1 - 0.05);
      const innerR = Math.min(w, h) * 0.28 + Math.random() * 40;
      const length = 40 + vel * 600;

      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * (innerR + length);
      const y2 = cy + Math.sin(angle) * (innerR + length);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  initLenis() {
    const isMobile = window.innerWidth <= 768;
    this.lenis = new Lenis({
      duration: isMobile ? 1.4 : 2.0, // Responsive luxury motion
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: true,
      syncTouch: true,
      touchMultiplier: 1.4
    });

    this.lenis.on('scroll', ScrollTrigger.update);

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
      scrub: 1.8, // Increased scrub inertia for cinematic crane weight
      onUpdate: (self) => {
        this.setProgress(self.progress);
      }
    });
  }

  /**
   * Evaluates the Monotone Cubic Hermite (PCHIP) spline at progress p
   */
  evalSpline(p) {
    const kfs = this.cameraKeyframes;
    let i = 0;
    while (i < kfs.length - 1 && kfs[i + 1].p < p) {
      i++;
    }

    const k0 = kfs[i];
    const k1 = kfs[Math.min(i + 1, kfs.length - 1)];
    const h = Math.max(k1.p - k0.p, 0.0001);
    const t = Math.max(0, Math.min(1, (p - k0.p) / h));

    const t2 = t * t;
    const t3 = t2 * t;

    // Cubic Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const idx0 = i;
    const idx1 = Math.min(i + 1, kfs.length - 1);

    return {
      pos: [
        h00 * k0.pos[0] + h10 * h * this.mPosX[idx0] + h01 * k1.pos[0] + h11 * h * this.mPosX[idx1],
        h00 * k0.pos[1] + h10 * h * this.mPosY[idx0] + h01 * k1.pos[1] + h11 * h * this.mPosY[idx1],
        h00 * k0.pos[2] + h10 * h * this.mPosZ[idx0] + h01 * k1.pos[2] + h11 * h * this.mPosZ[idx1]
      ],
      target: [
        h00 * k0.target[0] + h10 * h * this.mTargetX[idx0] + h01 * k1.target[0] + h11 * h * this.mTargetX[idx1],
        h00 * k0.target[1] + h10 * h * this.mTargetY[idx0] + h01 * k1.target[1] + h11 * h * this.mTargetY[idx1],
        h00 * k0.target[2] + h10 * h * this.mTargetZ[idx0] + h01 * k1.target[2] + h11 * h * this.mTargetZ[idx1]
      ],
      fov: h00 * k0.fov + h10 * h * this.mFov[idx0] + h01 * k1.fov + h11 * h * this.mFov[idx1]
    };
  }

  /**
   * Sets master progress [0, 1] and updates target spline trajectory
   */
  setProgress(progress, immediate = false) {
    const delta = Math.abs(progress - this.lastProgress);
    this.scrollVelocity = delta;
    this.lastProgress = progress;

    this.masterProgress = Math.max(0, Math.min(1, progress));

    // Audio whoosh on chapter changes
    const chapterObj = getChapterFromProgress(this.masterProgress);
    if (this.lastChapterIndex !== -1 && this.lastChapterIndex !== chapterObj.index) {
      audioManager.playWhoosh(0.35);
    }
    this.lastChapterIndex = chapterObj.index;

    // Orbit controls logic:
    // Exterior chapter (0.10 - 0.28) allows restricted orbit
    // CTA (>= 0.94) allows full 360° orbit
    const inExterior = this.masterProgress >= 0.10 && this.masterProgress <= 0.28;
    const isAtCTA = this.masterProgress >= 0.94;
    const canOrbit = inExterior || isAtCTA;

    if (this.controls) {
      if (canOrbit) {
        if (!this.controls.enabled) {
          this.controls.target.copy(this.cameraTarget);
          this.controls.enabled = true;
        }
        if (inExterior) {
          this.controls.minAzimuthAngle = -Math.PI / 4;
          this.controls.maxAzimuthAngle = Math.PI / 4;
          this.controls.minPolarAngle = Math.PI / 4;
          this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        } else {
          this.controls.minAzimuthAngle = -Infinity;
          this.controls.maxAzimuthAngle = Infinity;
          this.controls.minPolarAngle = 0.2;
          this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
        }
      } else {
        if (this.controls.enabled) {
          this.controls.enabled = false;
          this.isUserOrbiting = false;
        }
      }
    }

    // Evaluate continuous spline via CameraRig for smooth target coordinates
    if (!canOrbit || !this.isUserOrbiting) {
      if (this.cameraRig) {
        const state = this.cameraRig.evalChannels(this.masterProgress);
        this.targetCamPos.copy(state.pos);
        this.targetCamTarget.copy(state.target);
        this.targetFov = state.fov;

        if (immediate || !this.isInitialized) {
          this.camera.position.copy(this.targetCamPos);
          this.cameraTarget.copy(this.targetCamTarget);
          this.camera.fov = this.targetFov;
          this.camera.updateProjectionMatrix();
          this.camera.lookAt(this.cameraTarget);
          this.isInitialized = true;
        }
      }
    }

    // Drive Chapter-specific scene dynamics, lighting & DoF
    this.updateChapterDynamics(this.masterProgress);

    // Update HTML Overlays & Leader Lines
    if (this.overlay) {
      this.overlay.update(this.masterProgress, this.camera);
    }
  }

  /**
   * Per-frame heavy hydraulic camera inertia update
   * Glides the camera toward target coordinates, completely eliminating sudden jerks or stops
   */
  updateDampedCamera(dt = 0.016) {
    if (this.scrollVelocity > 0.001) {
      this.renderSpeedLines(this.scrollVelocity);
      this.scrollVelocity *= 0.88;
    } else if (this.speedCtx && this.speedCanvas) {
      this.speedCtx.clearRect(0, 0, this.speedCanvas.width, this.speedCanvas.height);
    }

    if (this.controls && this.controls.enabled && this.isUserOrbiting) {
      this.controls.update();
      return;
    }

    // Drive camera through CameraRig
    if (this.cameraRig) {
      const state = this.cameraRig.update(this.masterProgress, dt, this.scrollVelocity);
      this.cameraTarget.copy(state.target);

      // Pass focus and aperture to post processing DoF if active
      if (this.post) {
        if (state.aperture > 0.05) {
          this.post.setDoFState(state.target, state.aperture);
        }
        if (this.post.chromaticAberrationEffect) {
          const streakIntensity = 0.0007 + Math.min(0.003, state.velocity * 0.12);
          this.post.chromaticAberrationEffect.offset.set(streakIntensity, streakIntensity * 0.5);
        }
      }

      // Modulate audio engine idle & silence at dolly zoom
      audioManager.updateEnginePitch(this.masterProgress, this.scrollVelocity);
    }
  }

  updateChapterDynamics(p) {
    const { heroSweepLight, stripLight, keyLight, rimLightLeft, rimLightRight, underGlow, leftHeadlightBeam, rightHeadlightBeam } = this.lights;

    // CHAPTER 01: THE REVEAL (0.00 - 0.12) — "Darkness, then speed"
    // Lighting: pure black; a single strip light sweeps left to right revealing silhouette in pieces
    if (p <= 0.12) {
      const heroT = p / 0.12;

      // Pure black scene
      if (this.lights.hemiLight) this.lights.hemiLight.intensity = 0.02;
      keyLight.intensity = 0.05 * heroT;
      rimLightLeft.intensity = 0.0;
      if (rimLightRight) rimLightRight.intensity = 0.0;
      if (underGlow) underGlow.intensity = 0.0;

      // Precision strip light sweep from X: -6.0 to +6.0
      const stripX = -6.0 + heroT * 12.0;
      if (stripLight) {
        stripLight.position.set(stripX, 2.2, 3.2);
        stripLight.target.position.set(stripX * 0.85, 0.45, 0.0);
        stripLight.intensity = Math.sin(heroT * Math.PI) * 26.0;
      }
      if (heroSweepLight) {
        heroSweepLight.intensity = 0.0;
      }

      // Headlight beams ignite toward the end of reveal
      const beamP = Math.max(0, (heroT - 0.55) / 0.45);
      if (leftHeadlightBeam && rightHeadlightBeam) {
        const beamIntensity = beamP * 12.0;
        leftHeadlightBeam.intensity = beamIntensity;
        rightHeadlightBeam.intensity = beamIntensity;
      }

      if (this.carContainer) {
        const settleSpring = Math.sin(heroT * Math.PI) * 0.02;
        this.carContainer.position.y = -settleSpring;
      }

      this.explode.update(0);
      this.explode.setFocusGroup(null);
      if (this.post) {
        this.post.setDoFState(null, 0.0);
        this.post.setBloomIntensity(1.35);
      }
    }
    // CHAPTER 02: THE ORBIT (0.12 - 0.30) — "Walk the room"
    // Lighting: studio rim & rack focus
    else if (p > 0.12 && p <= 0.30) {
      if (stripLight) stripLight.intensity = 0.0;
      if (this.lights.hemiLight) this.lights.hemiLight.intensity = 0.45;
      keyLight.intensity = 2.2;
      rimLightLeft.intensity = 1.9;
      if (rimLightRight) rimLightRight.intensity = 1.6;
      if (underGlow) underGlow.intensity = 1.1;

      if (leftHeadlightBeam && rightHeadlightBeam) {
        leftHeadlightBeam.intensity = 12.0;
        rightHeadlightBeam.intensity = 12.0;
      }
      if (this.carContainer) this.carContainer.position.y = 0;

      this.explode.update(0);
      this.explode.setFocusGroup(null);
      if (this.post) {
        this.post.setBloomIntensity(1.35);
      }
    }
    // CHAPTER 03: THE DOLLY ZOOM (0.30 - 0.36) — "The moment you realize"
    // Hitchcock dolly zoom used once. Dark screen, cut audio and bloom briefly for emphasis.
    else if (p > 0.30 && p <= 0.36) {
      if (stripLight) stripLight.intensity = 0.0;
      if (this.lights.hemiLight) this.lights.hemiLight.intensity = 0.05;
      keyLight.intensity = 0.35;
      rimLightLeft.intensity = 0.25;
      if (rimLightRight) rimLightRight.intensity = 0.15;
      if (underGlow) underGlow.intensity = 0.0;

      if (leftHeadlightBeam && rightHeadlightBeam) {
        leftHeadlightBeam.intensity = 1.5;
        rightHeadlightBeam.intensity = 1.5;
      }

      this.explode.update(0);
      this.explode.setFocusGroup(null);
      if (this.post) {
        this.post.setBloomIntensity(0.0); // Cut bloom for emphasis
        this.post.setDoFState(null, 0.0);
      }
    }
    // CHAPTER 04: THE TEARDOWN (0.36 - 0.75) — "Layer by layer"
    // Vertical crane rising as each layer lifts away. Inactive layers fade to 12%.
    else if (p > 0.36 && p <= 0.75) {
      if (stripLight) stripLight.intensity = 0.0;
      if (this.lights.hemiLight) this.lights.hemiLight.intensity = 0.40;
      keyLight.intensity = 2.2;
      rimLightLeft.intensity = 2.0;
      if (rimLightRight) rimLightRight.intensity = 1.5;
      if (underGlow) underGlow.intensity = 0.9;

      if (leftHeadlightBeam && rightHeadlightBeam) {
        leftHeadlightBeam.intensity = 6.0;
        rightHeadlightBeam.intensity = 6.0;
      }

      if (this.post) {
        this.post.setBloomIntensity(1.2);
        this.post.setDoFState(null, 0.0);
      }

      // Explosion factor curve: 0.36 -> 0.70 expands to 1.0; 0.70 -> 0.75 settles back to 0.0
      let explodeFactor = 0;
      if (p <= 0.70) {
        explodeFactor = Math.max(0, Math.min(1.0, (p - 0.36) / (0.68 - 0.36)));
      } else {
        explodeFactor = Math.max(0, 1.0 - (p - 0.70) / (0.75 - 0.70));
      }
      this.explode.update(explodeFactor);

      // Determine active subsystem layer
      const layerProgress = (p - 0.36) / (0.70 - 0.36);
      let activeGroup = null;
      if (layerProgress < 0.18) activeGroup = 'body_panels';
      else if (layerProgress < 0.35) activeGroup = 'glass_and_lights';
      else if (layerProgress < 0.52) activeGroup = 'interior';
      else if (layerProgress < 0.70) activeGroup = 'mechanical';
      else if (layerProgress < 0.85) activeGroup = 'brakes';
      else activeGroup = 'wheels';

      this.explode.setFocusGroup(activeGroup);
    }
    // CHAPTER 05: THE MACRO (0.75 - 0.90) — "Details nobody asked for"
    // Probe-lens crawl millimetres above surface. Clearcoat streaks, bloom only on emissives.
    else if (p > 0.75 && p <= 0.90) {
      if (stripLight) stripLight.intensity = 0.0;
      if (this.lights.hemiLight) this.lights.hemiLight.intensity = 0.35;
      keyLight.intensity = 2.6;
      rimLightLeft.intensity = 2.8;
      if (rimLightRight) rimLightRight.intensity = 1.8;
      if (underGlow) underGlow.intensity = 0.8;

      if (leftHeadlightBeam && rightHeadlightBeam) {
        leftHeadlightBeam.intensity = 14.0;
        rightHeadlightBeam.intensity = 14.0;
      }

      this.explode.update(0);
      this.explode.setFocusGroup(null);

      if (this.post) {
        this.post.setBloomIntensity(1.6); // Sharp emissive bloom
      }
    }
    // CHAPTER 06: THE FINALE (0.90 - 1.00) — "Make it yours"
    // Slow turntable, car centered, customizer ready.
    else {
      if (this.lights.hemiLight) this.lights.hemiLight.intensity = 0.45;
      keyLight.intensity = 2.2;
      rimLightLeft.intensity = 2.0;
      if (rimLightRight) rimLightRight.intensity = 1.6;
      if (underGlow) underGlow.intensity = 1.0;

      if (leftHeadlightBeam && rightHeadlightBeam) {
        leftHeadlightBeam.intensity = 12.0;
        rightHeadlightBeam.intensity = 12.0;
      }

      this.explode.update(0);
      this.explode.setFocusGroup(null);
      if (this.post) {
        this.post.setBloomIntensity(1.35);
        this.post.setDoFState(null, 0.0);
      }
    }
  }

  setupGlobalTestingHook() {
    window.__setProgress = (p) => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const targetScroll = p * scrollHeight;
      if (this.lenis) {
        this.lenis.scrollTo(targetScroll, { immediate: true });
      } else {
        window.scrollTo(0, targetScroll);
      }
      this.setProgress(p, true);
      if (this.cameraRig) {
        this.cameraRig.update(p, 0.016, 0);
      }
      console.log(`[TestingHook] Master progress scrubbed to ${p.toFixed(3)}`);
    };
  }

  cut(chapterIndex) {
    if (this.cameraRig) {
      this.cameraRig.cut(chapterIndex, () => {
        const offsets = this.cameraRig.chapterOffsets || [0.0, 0.12, 0.30, 0.36, 0.75, 0.90];
        const targetP = offsets[chapterIndex] ?? 0.0;
        this.setProgress(targetP, true);
      });
    }
  }

  scrollToChapter(index) {
    const chapterOffsets = this.cameraRig ? this.cameraRig.chapterOffsets : [0.0, 0.12, 0.30, 0.36, 0.75, 0.90];
    const targetP = chapterOffsets[index] ?? 0;
    this.cut(index);
    if (this.lenis) {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      this.lenis.scrollTo(targetP * scrollHeight, { immediate: false, duration: 0.5 });
    }
  }
}
