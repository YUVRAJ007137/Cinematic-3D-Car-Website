import * as THREE from 'three';
import { setGroupFocus } from './materials.js';

/**
 * Data-Driven Exploded View Engine (PRD Sections 7.2 & 7.3)
 * Controls layer expansion, organic seeded jitter, micro-rotation, focus effects, and 3D screen projection.
 */

// Simple deterministic hash for seeded organic jitter
function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Smooth S-curve easing functions: zero initial velocity, zero final velocity
// Eliminates sudden bursts or jerky kickoffs when parts begin moving
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class ExplodeController {
  constructor(modelRoot, groupsData, explodeConfig) {
    this.modelRoot = modelRoot;
    this.groupsData = groupsData;
    this.explodeConfig = explodeConfig;
    this.partRecords = [];
    this.activeFocusGroup = null;

    this.initPartRecords();
  }

  initPartRecords() {
    let index = 0;

    this.modelRoot.traverse((node) => {
      if (!node.isMesh) return;

      const name = node.name;
      const cleanName = name.replace(/\./g, '');
      const parentName = node.parent && node.parent !== this.modelRoot ? node.parent.name : '';
      const cleanParent = parentName ? parentName.replace(/\./g, '') : '';

      // Determine group assignment
      const groupInfo = this.groupsData[name] ||
                        this.groupsData[cleanName] ||
                        (parentName && (this.groupsData[parentName] || this.groupsData[cleanParent])) ||
                        (node.name.startsWith('proc_') ? { group: 'mechanical' } : { group: 'misc' });

      const groupKey = groupInfo.group || 'misc';
      const cfg = this.explodeConfig[groupKey] || this.explodeConfig.misc;

      // Seeded jitter vector (3-5% of distance)
      const seed = ++index;
      const jx = (pseudoRandom(seed * 1.1) - 0.5) * 0.08;
      const jy = (pseudoRandom(seed * 2.3) - 0.5) * 0.08;
      const jz = (pseudoRandom(seed * 3.7) - 0.5) * 0.08;

      // Rest position in model local coordinates
      const restPos = node.userData.restPosition ? node.userData.restPosition.clone() : node.position.clone();

      // Rest quaternion for micro-rotation (store before any animation)
      const restQuat = node.quaternion.clone();

      // Seeded per-part rotation axis (normalized random vector)
      const rax = pseudoRandom(seed * 4.9) - 0.5;
      const ray = pseudoRandom(seed * 5.3) - 0.5;
      const raz = pseudoRandom(seed * 6.7) - 0.5;
      const rotAxis = new THREE.Vector3(rax, ray, raz).normalize();

      // Seeded max rotation angle: 2-5° range (0.035 - 0.087 radians)
      const rotAngle = 0.035 + pseudoRandom(seed * 7.1) * (0.087 - 0.035);

      // Determine lateral direction sign: if part is on right side of vehicle centerline, invert X direction
      const worldCenter = node.userData.center || new THREE.Vector3();
      const isRightSide = worldCenter.x < 0.0;
      const dir = [...cfg.direction];
      if (groupKey === 'wheels' || groupKey === 'brakes') {
        // Lateral expansion outwards
        dir[0] = isRightSide ? -Math.abs(dir[0]) : Math.abs(dir[0]);
      }

      // Pre-allocate a scratch quaternion for per-frame rotation to avoid GC pressure
      const _scratchQuat = new THREE.Quaternion();

      this.partRecords.push({
        node,
        name,
        groupKey,
        restPos,
        restQuat,
        dir: new THREE.Vector3(dir[0], dir[1], dir[2]),
        distance: cfg.distance,
        startProgress: cfg.start,
        endProgress: cfg.end,
        jitter: new THREE.Vector3(jx, jy, jz),
        rotAxis,
        rotAngle,
        _scratchQuat
      });
    });

    console.log(`ExplodeController initialized with ${this.partRecords.length} registered parts.`);
  }

  /**
   * Updates exploded parts positions and micro-rotations based on local explode chapter progress [0, 1]
   * Perfectly reversible scrubbing.
   */
  update(explodeProgress) {
    const p = Math.max(0, Math.min(1, explodeProgress));

    for (let i = 0; i < this.partRecords.length; i++) {
      const rec = this.partRecords[i];
      const { node, restPos, restQuat, dir, distance, startProgress, endProgress, jitter, rotAxis, rotAngle, _scratchQuat } = rec;

      // Calculate staggered local progress
      let localT = 0;
      if (p <= startProgress) {
        localT = 0;
      } else if (p >= endProgress) {
        localT = 1;
      } else {
        localT = (p - startProgress) / (endProgress - startProgress);
      }

      // Position uses smooth S-curve easeInOutCubic (accelerates and decelerates with zero jerk)
      const easedT = easeInOutCubic(localT);

      // Reduce jitter on mobile / small screens to prevent crowded or vibrating parts
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      const jitterScale = isMobile ? 0.35 : 1.0;

      // position = rest + (direction * distance + jitter * scale) * ease(localProgress)
      node.position.x = restPos.x + (dir.x * distance + jitter.x * jitterScale) * easedT;
      node.position.y = restPos.y + (dir.y * distance + jitter.y * jitterScale) * easedT;
      node.position.z = restPos.z + (dir.z * distance + jitter.z * jitterScale) * easedT;

      // Micro-rotation uses easeInOutQuad for organic, gentle settling
      const rotEasedT = easeInOutQuad(localT);

      // rotation = restQuat * Quaternion.fromAxisAngle(rotAxis, rotAngle * easedT)
      // Reversible: at localT = 0, rotEasedT = 0, quaternion == restQuat
      _scratchQuat.setFromAxisAngle(rotAxis, rotAngle * rotEasedT);
      node.quaternion.copy(restQuat).multiply(_scratchQuat);
    }
  }

  /**
   * Sets focus state for active callout group
   */
  setFocusGroup(groupKey) {
    if (this.activeFocusGroup === groupKey) return;
    this.activeFocusGroup = groupKey;
    setGroupFocus(groupKey, this.modelRoot, this.groupsData);
  }

  /**
   * Projects a 3D anchor vector to 2D screen coordinate pixels (x, y)
   */
  projectToScreen(anchorVec3, camera, screenWidth, screenHeight) {
    const v = new THREE.Vector3(anchorVec3[0], anchorVec3[1], anchorVec3[2]);
    v.project(camera);

    const x = (v.x * 0.5 + 0.5) * screenWidth;
    const y = (-(v.y * 0.5) + 0.5) * screenHeight;
    const isBehind = v.z > 1.0;

    return { x, y, visible: !isBehind && x >= 0 && x <= screenWidth && y >= 0 && y <= screenHeight };
  }
}
