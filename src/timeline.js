import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import Lenis from 'lenis';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll Timeline Engine — Monotone Cubic Hermite Spline (PCHIP) & Studio Hydraulic Crane Damping
 *
 * Eliminates sudden camera movements, stops, and jerks:
 * 1. Fritsch-Carlson PCHIP Spline: Monotone cubic Hermite interpolation guarantees strictly monotonic
 *    curves between keyframes with ZERO overshoot, zero artificial oscillations, and zero direction whips.
 * 2. Heavy Hydraulic Damping: Low-pass lerp filter simulates a 500lb Hollywood camera crane with fluid
 *    head damping, smoothing trackpad/mouse-wheel impulses into continuous, gliding cinematography.
 * 3. Luxurious Studio Easing: 2.0s Lenis duration paired with 1.8s scrub inertia.
 */

// Fritsch-Carlson Monotone Cubic Hermite (PCHIP) tangent calculation
function computePchipTangents(xs, ys) {
  const n = xs.length;
  const m = new Array(n).fill(0);
  if (n <= 1) return m;
  if (n === 2) {
    const slope = (ys[1] - ys[0]) / Math.max(xs[1] - xs[0], 0.0001);
    m[0] = slope;
    m[1] = slope;
    return m;
  }

  // 1. Calculate secant slopes delta_k = (y_{k+1} - y_k) / (x_{k+1} - x_k)
  const deltas = new Array(n - 1);
  for (let k = 0; k < n - 1; k++) {
    const dx = Math.max(xs[k + 1] - xs[k], 0.0001);
    deltas[k] = (ys[k + 1] - ys[k]) / dx;
  }

  // 2. Initial slopes using weighted harmonic mean / standard PCHIP formula
  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];

  for (let k = 1; k < n - 1; k++) {
    const d0 = deltas[k - 1];
    const d1 = deltas[k];
    // If slope changes sign or either is zero, it is a local extremum -> slope must be 0 (no overshoot!)
    if (d0 * d1 <= 0) {
      m[k] = 0;
    } else {
      const h0 = xs[k] - xs[k - 1];
      const h1 = xs[k + 1] - xs[k];
      const w0 = 2 * h1 + h0;
      const w1 = h1 + 2 * h0;
      m[k] = (w0 + w1) / ((w0 / d0) + (w1 / d1));
    }
  }

  // 3. Fritsch-Carlson 2-pass safeguard to strictly guarantee monotonicity
  for (let k = 0; k < n - 1; k++) {
    const d = deltas[k];
    if (Math.abs(d) < 1e-7) {
      m[k] = 0;
      m[k + 1] = 0;
    } else {
      const a = m[k] / d;
      const b = m[k + 1] / d;
      if (a < 0) m[k] = 0;
      if (b < 0) m[k + 1] = 0;
      const normSq = a * a + b * b;
      if (normSq > 9) {
        const tau = 3 / Math.sqrt(normSq);
        m[k] = tau * a * d;
        m[k + 1] = tau * b * d;
      }
    }
  }

  return m;
}

export class TimelineController {
  constructor({ camera, cameraTarget, lights, explodeController, overlayController, postController, carContainer, canvas }) {
    this.camera = camera;
    this.cameraTarget = cameraTarget;
    this.lights = lights;
    this.explode = explodeController;
    this.overlay = overlayController;
    this.post = postController;
    this.carContainer = carContainer;
    this.canvas = canvas;

    this.masterProgress = 0;
    this.currentChapterIndex = 0;
    this.lenis = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Target vectors for inertial camera dampening
    this.targetCamPos = new THREE.Vector3(3.6, 0.68, 3.8);
    this.targetCamTarget = new THREE.Vector3(0.0, 0.32, 0.3);
    this.targetFov = 32;
    this.isInitialized = false;

    // Interactive 360° OrbitControls for Chapter 6 (CTA Section)
    this.initOrbitControls();

    // Stabilized Cinematic Camera Keyframes — Harmonious Single-Arc Orbit
    this.cameraKeyframes = [
      // Chapter 1: Hero Reveal (0.00 - 0.10) — dramatic low 3/4 front angle
      { p: 0.00, pos: [3.6, 0.68, 3.8],  target: [0.0, 0.32, 0.3], fov: 32 },
      { p: 0.05, pos: [3.4, 0.88, 3.5],  target: [0.0, 0.38, 0.2], fov: 33 },
      { p: 0.10, pos: [3.3, 1.10, 3.3],  target: [0.0, 0.42, 0.1], fov: 34 },

      // Chapter 2: Exterior Orbit (0.10 - 0.28) — graceful tracking arc along side
      { p: 0.18, pos: [3.8, 1.15, 2.6],  target: [0.0, 0.44, 0.1], fov: 35 },
      { p: 0.28, pos: [3.8, 1.35, 1.9],  target: [0.0, 0.48, 0.1], fov: 35 },

      // Chapter 3: Exploded View (0.28 - 0.68) — stable elevated crane overlooking explosion
      // 3.1: Body Panels (0.28 - 0.35)
      { p: 0.35, pos: [3.6, 1.95, 2.3],  target: [0.10, 0.60, 0.2], fov: 35 },
      // 3.2: Optical & Glass (0.35 - 0.42)
      { p: 0.42, pos: [3.3, 1.85, 2.0],  target: [0.15, 0.58, 0.3], fov: 34 },
      // 3.3: Handcrafted Cockpit (0.42 - 0.49)
      { p: 0.49, pos: [2.9, 1.80, 1.4],  target: [0.10, 0.55, 0.1], fov: 34 },
      // 3.4: W16 Engine & Chassis (0.49 - 0.56)
      { p: 0.56, pos: [2.8, 1.65, 0.9],  target: [0.10, 0.50, 0.0], fov: 34 },
      // 3.5: Carbon-Ceramic Brakes (0.56 - 0.62)
      { p: 0.62, pos: [2.7, 1.25, 1.3],  target: [0.35, 0.42, 0.6], fov: 33 },
      // 3.6: Magnesium Aero Wheels (0.62 - 0.68)
      { p: 0.68, pos: [2.9, 1.15, 1.6],  target: [0.40, 0.42, 0.6], fov: 33 },

      // Chapter 4: Reassembly & Form Settle (0.68 - 0.78) — majestic cinematic pullback
      { p: 0.73, pos: [3.5, 1.25, 2.3],  target: [0.10, 0.44, 0.2], fov: 35 },
      { p: 0.78, pos: [3.8, 1.20, 2.8],  target: [0.00, 0.42, 0.1], fov: 35 },

      // Chapter 5: Cinematic Detail Precision (0.78 - 0.92) — macro photography with creamy bokeh
      // 5.1: Quad-LED Matrix Projector (0.78 - 0.83)
      { p: 0.83, pos: [2.0, 0.80, 2.4],  target: [0.48, 0.50, 1.55], fov: 26 },
      // 5.2: Forged Magnesium Wheel & Brembo Caliper (0.83 - 0.88)
      { p: 0.88, pos: [2.3, 0.58, 1.3],  target: [0.72, 0.36, 1.05], fov: 26 },
      // 5.3: Rear Haunch & Continuous LED Blade (0.88 - 0.92)
      { p: 0.92, pos: [2.7, 0.95, -0.2], target: [0.30, 0.58, -0.90], fov: 28 },

      // Chapter 6: Showroom Configurator & Free 360° Orbit (0.92 - 1.00)
      { p: 0.96, pos: [3.4, 1.15, 2.6],  target: [0.00, 0.40, 0.1], fov: 34 },
      { p: 1.00, pos: [3.5, 1.12, 3.0],  target: [0.00, 0.40, 0.1], fov: 34 }
    ];

    // Pre-calculate Monotone Cubic Hermite (PCHIP) tangents
    this.initCameraSpline();

    this.initLenis();
    this.initScrollTrigger();
    this.setupGlobalTestingHook();

    window.__timeline = this;
    window.__camera = this.camera;
    window.__cameraTarget = this.cameraTarget;
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

  initLenis() {
    this.lenis = new Lenis({
      duration: 2.0, // Slowed down for luxurious, velvet motion
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
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
    this.masterProgress = Math.max(0, Math.min(1, progress));

    const isAtCTA = this.masterProgress >= 0.94;
    if (this.controls) {
      if (isAtCTA && !this.controls.enabled) {
        this.controls.target.copy(this.cameraTarget);
        this.controls.enabled = true;
      } else if (!isAtCTA && this.controls.enabled) {
        this.controls.enabled = false;
      }
    }

    // Evaluate PCHIP continuous spline for smooth target coordinates
    if (!isAtCTA || (this.controls && !this.controls.state)) {
      const state = this.evalSpline(this.masterProgress);
      this.targetCamPos.set(state.pos[0], state.pos[1], state.pos[2]);
      this.targetCamTarget.set(state.target[0], state.target[1], state.target[2]);
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
    if (this.controls && this.controls.enabled) {
      this.controls.update();
      return;
    }

    // Damping factor ~0.050 per 60fps frame — creates heavy Hollywood camera crane weight
    const lerpFactor = Math.min(1.0, 0.050 * (dt / 0.016));
    this.camera.position.lerp(this.targetCamPos, lerpFactor);
    this.cameraTarget.lerp(this.targetCamTarget, lerpFactor);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, lerpFactor);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.cameraTarget);
  }

  updateChapterDynamics(p) {
    const { heroSweepLight, keyLight, rimLightLeft, underGlow, leftHeadlightBeam, rightHeadlightBeam } = this.lights;

    // Chapter 1: Hero Reveal (0 - 0.10)
    if (p <= 0.10) {
      const heroT = p / 0.10;

      heroSweepLight.intensity = Math.sin(heroT * Math.PI) * 16.0;
      heroSweepLight.position.x = -5.0 + heroT * 10.0;
      heroSweepLight.position.z = 4.0 - heroT * 2.0;

      keyLight.intensity = 0.2 + heroT * 1.8;
      rimLightLeft.intensity = heroT * 1.6;
      if (underGlow) underGlow.intensity = heroT * 1.2;

      const beamP = Math.max(0, (heroT - 0.4) / 0.6);
      if (leftHeadlightBeam && rightHeadlightBeam) {
        const beamIntensity = beamP * 12.0;
        leftHeadlightBeam.intensity = beamIntensity;
        rightHeadlightBeam.intensity = beamIntensity;
      }

      if (this.carContainer) {
        const settleSpring = Math.sin(heroT * Math.PI) * 0.03;
        this.carContainer.position.y = -settleSpring;
      }

      this.explode.update(0);
      this.explode.setFocusGroup(null);
      if (this.post) this.post.setDoFState(null, 0.0);
    }
    // Chapter 2: Exterior Orbit (0.10 - 0.28)
    else if (p > 0.10 && p <= 0.28) {
      heroSweepLight.intensity = 0.0;
      keyLight.intensity = 2.2;
      rimLightLeft.intensity = 1.8;
      if (underGlow) underGlow.intensity = 1.2;

      if (leftHeadlightBeam && rightHeadlightBeam) {
        leftHeadlightBeam.intensity = 12.0;
        rightHeadlightBeam.intensity = 12.0;
      }

      if (this.carContainer) this.carContainer.position.y = 0;

      this.explode.update(0);
      this.explode.setFocusGroup(null);
      if (this.post) this.post.setDoFState(null, 0.0);
    }
    // Chapter 3: Exploded View (0.28 - 0.68)
    else if (p > 0.28 && p <= 0.68) {
      heroSweepLight.intensity = 0.0;
      keyLight.intensity = 2.0;

      const explodeT = (p - 0.28) / (0.68 - 0.28);
      this.explode.update(explodeT);

      let activeGroup = null;
      if (explodeT < 0.18) activeGroup = 'body_panels';
      else if (explodeT < 0.35) activeGroup = 'glass_and_lights';
      else if (explodeT < 0.52) activeGroup = 'interior';
      else if (explodeT < 0.70) activeGroup = 'mechanical';
      else if (explodeT < 0.85) activeGroup = 'brakes';
      else activeGroup = 'wheels';

      this.explode.setFocusGroup(activeGroup);
      if (this.post) this.post.setDoFState(null, 0.0);
    }
    // Chapter 4: Reassembly & Form Settle (0.68 - 0.78)
    else if (p > 0.68 && p <= 0.78) {
      const reassembleT = Math.max(0, 1.0 - (p - 0.68) / (0.75 - 0.68));
      this.explode.update(reassembleT);
      this.explode.setFocusGroup(null);
      if (this.post) this.post.setDoFState(null, 0.0);
    }
    // Chapter 5: Detail Shots (0.78 - 0.92)
    else if (p > 0.78 && p <= 0.92) {
      this.explode.update(0);
      this.explode.setFocusGroup(null);

      keyLight.intensity = 2.4;
      rimLightLeft.intensity = 2.6;

      const detT = (p - 0.78) / (0.92 - 0.78);
      const bokehIntensity = Math.sin(detT * Math.PI) * 4.5;
      if (this.post) {
        this.post.setDoFState(this.cameraTarget, bokehIntensity);
      }
    }
    // Chapter 6: CTA & Final Pose (0.92 - 1.00)
    else {
      this.explode.update(0);
      this.explode.setFocusGroup(null);
      keyLight.intensity = 2.0;
      rimLightLeft.intensity = 2.2;
      if (this.post) this.post.setDoFState(null, 0.0);
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
      console.log(`[TestingHook] Master progress scrubbed to ${p.toFixed(3)}`);
    };
  }

  scrollToChapter(index) {
    const chapterOffsets = [0.0, 0.18, 0.45, 0.75, 0.86, 0.98];
    const targetP = chapterOffsets[index] ?? 0;
    window.__setProgress(targetP);
  }
}
