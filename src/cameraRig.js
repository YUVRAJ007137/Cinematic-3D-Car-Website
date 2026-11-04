import * as THREE from 'three';
import cameraConfig from '../config/camera.json';

/**
 * Cinematic Camera Rig Engine
 *
 * Implements:
 * 1. Progress-driven 3D position and look-at splines (THREE.CatmullRomCurve3).
 * 2. Independent scalar channels: fov, roll, focusDistance, aperture.
 * 3. Handheld camera micro-motion layer (noise-driven positional and optical roll sway).
 * 4. Speed ramp: smoothed velocity mapping to time-dilation & post-processing intensity.
 * 5. Instant whip-pan / crossfade cut(chapterIndex) for keyboard navigation.
 * 6. Visual in-scene spline and keyframe debugger via window.__camDebug(true).
 */

export class CameraRig {
  constructor({ camera, scene, canvas }) {
    this.camera = camera;
    this.scene = scene;
    this.canvas = canvas;

    this.keyframes = cameraConfig.keyframes || [];
    this.reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Output State Vectors
    this.currentPosition = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();
    this.currentFov = 28;
    this.currentRoll = 0; // degrees
    this.currentFocusDistance = 3.5;
    this.currentAperture = 0;
    this.currentHandheldAmp = 0;

    // Velocity & Speed Ramp
    this.smoothedVelocity = 0;
    this.timeDilation = 1.0;
    this.elapsedTime = 0;

    // Cut / Whip-pan Transition State
    this.isCutting = false;
    this.cutProgress = 0;
    this.cutDuration = 0.35;
    this.cutElapsed = 0;
    this.cutStartPos = new THREE.Vector3();
    this.cutStartTarget = new THREE.Vector3();
    this.cutStartFov = 28;
    this.cutTargetProgress = 0;

    // In-Scene Debug Visualizer
    this.debugGroup = null;
    this.isDebugActive = false;

    // Initialize Curves & Splines
    this.initCurves();

    // Attach global debug hook
    if (typeof window !== 'undefined') {
      window.__camDebug = (enabled = true) => this.setDebug(enabled);
      window.__cameraRig = this;
    }
  }

  initCurves() {
    if (!this.keyframes || this.keyframes.length === 0) return;

    const posPoints = this.keyframes.map(k => new THREE.Vector3(...k.pos));
    const targetPoints = this.keyframes.map(k => new THREE.Vector3(...k.target));

    // Centripetal CatmullRom curves prevent loops and unnatural overshoots
    this.posCurve = new THREE.CatmullRomCurve3(posPoints, false, 'centripetal', 0.5);
    this.targetCurve = new THREE.CatmullRomCurve3(targetPoints, false, 'centripetal', 0.5);

    // Chapter progress mapping for fast lookup
    this.chapterOffsets = [0.00, 0.12, 0.30, 0.36, 0.75, 0.90];
  }

  /**
   * Evaluates piecewise scalar channel values and curve samples at progress p in [0, 1]
   */
  evalChannels(p) {
    const kfs = this.keyframes;
    const clampedP = Math.max(0, Math.min(1, p));

    if (kfs.length === 0) {
      return {
        pos: new THREE.Vector3(3.6, 1.2, 3.8),
        target: new THREE.Vector3(0, 0.45, 0),
        fov: 32,
        roll: 0,
        focusDistance: 3.5,
        aperture: 0,
        handheldAmp: 0
      };
    }

    // Find bounding keyframes [k0, k1]
    let idx = 0;
    while (idx < kfs.length - 1 && kfs[idx + 1].p <= clampedP) {
      idx++;
    }

    const k0 = kfs[idx];
    const k1 = kfs[Math.min(idx + 1, kfs.length - 1)];

    let t = 0;
    const dp = k1.p - k0.p;
    if (dp > 0.00001) {
      t = (clampedP - k0.p) / dp;
      t = Math.max(0, Math.min(1, t));
    }

    // Smooth cubic Hermite ease-in-out factor for scalars
    const smoothT = t * t * (3 - 2 * t);

    // Interpolate positions along spline or between keyframes
    // Spline curve sampling mapped through keyframe array bounds
    const u0 = idx / (kfs.length - 1);
    const u1 = Math.min(idx + 1, kfs.length - 1) / (kfs.length - 1);
    const curveU = u0 + smoothT * (u1 - u0);

    const pos = this.posCurve.getPoint(curveU);
    const target = this.targetCurve.getPoint(curveU);

    // Scalar channels
    const fov = THREE.MathUtils.lerp(k0.fov, k1.fov, smoothT);
    const roll = THREE.MathUtils.lerp(k0.roll || 0, k1.roll || 0, smoothT);
    const focusDistance = THREE.MathUtils.lerp(k0.focusDistance || 3.5, k1.focusDistance || 3.5, smoothT);
    const aperture = THREE.MathUtils.lerp(k0.aperture || 0, k1.aperture || 0, smoothT);
    const handheldAmp = THREE.MathUtils.lerp(k0.handheldAmp ?? 0.004, k1.handheldAmp ?? 0.004, smoothT);

    return { pos, target, fov, roll, focusDistance, aperture, handheldAmp };
  }

  /**
   * Main per-frame update driven by progress, dt, and scroll velocity
   */
  update(progress, dt = 0.016, rawVelocity = 0) {
    this.elapsedTime += dt;

    // 1. Velocity smoothing & Speed Ramp
    const absVel = Math.abs(rawVelocity);
    const velLerp = Math.min(1.0, dt * 10.0);
    this.smoothedVelocity = THREE.MathUtils.lerp(this.smoothedVelocity, absVel, velLerp);

    // Time-dilation: fast scroll speeds up ambient, zero scroll drops to gentle floating slow-mo
    this.timeDilation = THREE.MathUtils.lerp(0.65, 2.5, Math.min(1.0, this.smoothedVelocity * 15.0));

    // 2. Handle instant cut/whip-pan transition if active
    if (this.isCutting) {
      this.cutElapsed += dt;
      const cutT = Math.min(1.0, this.cutElapsed / this.cutDuration);
      // Quintic whip-pan curve
      const whipEase = 1 - Math.pow(1 - cutT, 4);

      const targetChannels = this.evalChannels(this.cutTargetProgress);

      this.currentPosition.lerpVectors(this.cutStartPos, targetChannels.pos, whipEase);
      this.currentTarget.lerpVectors(this.cutStartTarget, targetChannels.target, whipEase);
      this.currentFov = THREE.MathUtils.lerp(this.cutStartFov, targetChannels.fov, whipEase);
      this.currentRoll = targetChannels.roll;
      this.currentFocusDistance = targetChannels.focusDistance;
      this.currentAperture = targetChannels.aperture;

      if (cutT >= 1.0) {
        this.isCutting = false;
      }
    } else {
      // Normal continuous evaluation
      const channels = this.evalChannels(progress);
      this.currentPosition.copy(channels.pos);
      this.currentTarget.copy(channels.target);
      this.currentFov = channels.fov;
      this.currentRoll = channels.roll;
      this.currentFocusDistance = channels.focusDistance;
      this.currentAperture = channels.aperture;
      this.currentHandheldAmp = this.reducedMotion ? 0 : channels.handheldAmp;
    }

    // 3. Handheld Noise Layer (Micro-motion position & roll sway)
    const effectiveHandheld = this.reducedMotion ? 0 : this.currentHandheldAmp;
    let swayX = 0;
    let swayY = 0;
    let swayZ = 0;
    let swayRoll = 0;

    if (effectiveHandheld > 0.0001) {
      const t = this.elapsedTime * this.timeDilation;
      // Multi-frequency sine harmonics (position <= 0.01 units, roll <= 0.4 deg)
      swayX = (Math.sin(t * 1.1) * 0.6 + Math.sin(t * 2.3) * 0.4) * effectiveHandheld;
      swayY = (Math.cos(t * 0.9) * 0.5 + Math.sin(t * 1.7) * 0.5) * (effectiveHandheld * 0.7);
      swayZ = (Math.sin(t * 0.7) * 0.4 + Math.cos(t * 1.9) * 0.6) * (effectiveHandheld * 0.5);
      swayRoll = (Math.sin(t * 1.3) * 0.7 + Math.cos(t * 2.7) * 0.3) * (effectiveHandheld * 40.0); // max ~0.4 deg
    }

    // 4. Apply to Three.js PerspectiveCamera
    this.camera.position.set(
      this.currentPosition.x + swayX,
      this.currentPosition.y + swayY,
      this.currentPosition.z + swayZ
    );

    this.camera.lookAt(this.currentTarget);

    // Apply optical roll rotation around the view axis
    const totalRoll = (this.currentRoll + swayRoll) * (Math.PI / 180.0);
    if (Math.abs(totalRoll) > 0.0001 && !this.reducedMotion) {
      this.camera.rotateZ(totalRoll);
    }

    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();

    // Update debug visualizer marker if active
    if (this.isDebugActive && this.debugCamMarker) {
      this.debugCamMarker.position.copy(this.camera.position);
    }

    return {
      position: this.camera.position,
      target: this.currentTarget,
      fov: this.currentFov,
      roll: this.currentRoll,
      focusDistance: this.currentFocusDistance,
      aperture: this.currentAperture,
      velocity: this.smoothedVelocity,
      timeDilation: this.timeDilation
    };
  }

  /**
   * Whip-pan or crossfade cut to a specified chapter index (0–5)
   */
  cut(chapterIndex, onComplete) {
    const targetP = this.chapterOffsets[chapterIndex] ?? 0.0;
    this.isCutting = true;
    this.cutElapsed = 0;
    this.cutTargetProgress = targetP;

    this.cutStartPos.copy(this.camera.position);
    this.cutStartTarget.copy(this.currentTarget);
    this.cutStartFov = this.camera.fov;

    if (onComplete) {
      setTimeout(onComplete, this.cutDuration * 1000);
    }
  }

  /**
   * Draws in-scene visual splines and keyframes for precision debugging
   */
  setDebug(enabled) {
    this.isDebugActive = enabled;

    if (!enabled) {
      if (this.debugGroup && this.scene) {
        this.scene.remove(this.debugGroup);
        this.debugGroup.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
        this.debugGroup = null;
      }
      console.log('[CameraRig Debug] In-scene camera splines removed.');
      return;
    }

    if (!this.scene || !this.posCurve || !this.targetCurve) return;

    if (this.debugGroup) {
      this.scene.remove(this.debugGroup);
    }

    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'CameraRigDebugVisualizer';

    // 1. Position Spline Path (Cyan Glow)
    const posPoints = this.posCurve.getPoints(200);
    const posGeom = new THREE.BufferGeometry().setFromPoints(posPoints);
    const posMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.85
    });
    const posLine = new THREE.Line(posGeom, posMat);
    posLine.renderOrder = 999;
    this.debugGroup.add(posLine);

    // 2. Look-At Target Spline Path (Amber Glow)
    const targetPoints = this.targetCurve.getPoints(200);
    const targetGeom = new THREE.BufferGeometry().setFromPoints(targetPoints);
    const targetMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.85
    });
    const targetLine = new THREE.Line(targetGeom, targetMat);
    targetLine.renderOrder = 999;
    this.debugGroup.add(targetLine);

    // 3. Keyframe Sphere Markers & Sight Rays
    const markerGeom = new THREE.SphereGeometry(0.04, 16, 16);
    const posMarkerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const targetMarkerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    this.keyframes.forEach((kf, idx) => {
      // Position marker
      const pMesh = new THREE.Mesh(markerGeom, posMarkerMat);
      pMesh.position.set(...kf.pos);
      this.debugGroup.add(pMesh);

      // Target marker
      const tMesh = new THREE.Mesh(markerGeom, targetMarkerMat);
      tMesh.position.set(...kf.target);
      this.debugGroup.add(tMesh);

      // Ray connecting camera position to look-at target
      const rayGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...kf.pos),
        new THREE.Vector3(...kf.target)
      ]);
      const rayMat = new THREE.LineDashedMaterial({
        color: 0xffffff,
        dashSize: 0.1,
        gapSize: 0.05,
        transparent: true,
        opacity: 0.35,
        depthTest: false
      });
      const rayLine = new THREE.Line(rayGeom, rayMat);
      rayLine.computeLineDistances();
      this.debugGroup.add(rayLine);
    });

    // 4. Active Camera Head Marker
    const headGeom = new THREE.SphereGeometry(0.06, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.debugCamMarker = new THREE.Mesh(headGeom, headMat);
    this.debugGroup.add(this.debugCamMarker);

    this.scene.add(this.debugGroup);
    console.log('[CameraRig Debug] In-scene splines rendered. Cyan=Position, Amber=Target, Red=Active Camera');
  }
}
