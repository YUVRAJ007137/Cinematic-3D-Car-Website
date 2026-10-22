import * as THREE from 'three';
import { CONFIG } from './content.js';

/**
 * Material Manager
 * Upgrades raw imported materials to high-end PBR materials with clearcoat,
 * emissive bloom tuning, realistic glass, tire rubber, and runtime paint switching.
 */

// Cache of upgraded materials and cloned references
const upgradedMaterials = new Map();
const paintMaterialsList = [];
const emissiveMaterialsList = [];

export function setupMaterials(modelRoot, groupsData) {
  const defaultPaint = CONFIG.PAINT_PRESETS[CONFIG.DEFAULT_COLOR_KEY] || CONFIG.PAINT_PRESETS.deep_rosso;

  // Master Paint Material for primary panels
  const masterPaintMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(defaultPaint.hex),
    metalness: defaultPaint.metalness,
    roughness: defaultPaint.roughness,
    clearcoat: defaultPaint.clearcoat,
    clearcoatRoughness: defaultPaint.clearcoatRoughness,
    reflectivity: 1.0,
    envMapIntensity: 1.8
  });

  // Carbon Fiber / Dark Accent Material
  const carbonMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x161618),
    metalness: 0.4,
    roughness: 0.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.2
  });

  // Aero / Tinted Glass Material (cheap & crisp, no transmission lag)
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0a101d),
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.0,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    envMapIntensity: 2.2
  });

  // Headlamp Matrix Glow Material (Bloom ready)
  const headlampGlowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffffff),
    emissive: new THREE.Color(0xdbeafe),
    emissiveIntensity: 4.5,
    toneMapped: false
  });

  // Tail Lamp LED Blade Material (Vibrant Red Bloom)
  const tailLampGlowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x220000),
    emissive: new THREE.Color(0xff1818),
    emissiveIntensity: 5.0,
    toneMapped: false
  });

  // Tire Rubber
  const tireRubberMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1a1a1c),
    roughness: 0.9,
    metalness: 0.05,
    envMapIntensity: 0.4
  });

  // Brake Caliper Finish (Gloss Racing Red / Aluminum)
  const caliperMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xdc2626),
    metalness: 0.85,
    roughness: 0.2,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.5
  });

  // Mechanical / Powertrain Alloy
  const mechanicalAlloyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x475569),
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 1.6
  });

  // Interior Leather / Alcantara
  const interiorAlcantaraMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1c1917),
    roughness: 0.95,
    metalness: 0.02,
    envMapIntensity: 0.3
  });

  // Traverse model and apply upgrades safely with cloning
  modelRoot.traverse((child) => {
    if (!child.isMesh) return;

    const name = child.name;
    const cleanName = name.replace(/\./g, '');
    const parentName = child.parent && child.parent !== modelRoot ? child.parent.name : '';
    const cleanParent = parentName ? parentName.replace(/\./g, '') : '';

    const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
    const matName = (origMat?.name || '').toLowerCase();

    // 1. Logo meshes visibility
    if (name.includes('bugatti_logo') || cleanName.includes('bugatti_logo') || cleanParent.includes('bugatti_logo')) {
      child.visible = CONFIG.SHOW_LOGOS;
    }

    // 2. Wheels & Tires
    if (name.includes('wheel') || cleanParent.includes('wheel')) {
      if (matName.includes('material_7') || matName.includes('rubber') || name.includes('tire')) {
        child.material = tireRubberMaterial.clone();
      } else {
        // Rim / spokes / hub
        const rimMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x18181b),
          metalness: 0.92,
          roughness: 0.22,
          envMapIntensity: 1.6
        });
        child.material = rimMat;
      }
    }
    // 3. Brake Calipers
    else if (name.startsWith('Caliper') || cleanName.startsWith('Caliper') || cleanParent.startsWith('Caliper')) {
      child.material = caliperMaterial.clone();
    }
    // 4. Glass
    else if (
      name.startsWith('GLASS') || cleanName.startsWith('GLASS') ||
      matName.includes('front glass') || matName.includes('glass')
    ) {
      child.material = glassMaterial.clone();
    }
    // 5. Headlights & Daytime LED glows
    else if (
      name.startsWith('LIGHT_GLOW') || cleanName.startsWith('LIGHT_GLOW') ||
      name.includes('CHROME_REFLECTOR') || cleanName.includes('CHROME_REFLECTOR')
    ) {
      const glowMat = headlampGlowMaterial.clone();
      child.material = glowMat;
      emissiveMaterialsList.push(glowMat);
    }
    // 6. Tail Lamp LED Blade
    else if (
      name.startsWith('TAIL_GLOW') || cleanName.startsWith('TAIL_GLOW') ||
      name.includes('GLASS_TAIL_LIGHT') || matName.includes('brake_lamp')
    ) {
      const tailMat = tailLampGlowMaterial.clone();
      child.material = tailMat;
      emissiveMaterialsList.push(tailMat);
    }
    // 7. Exterior Car Paint Panels
    else if (
      matName.includes('paint') || matName.includes('car paint') ||
      name === 'Box002004' || name === 'Box002.004'
    ) {
      // Differentiate primary body panels vs black/carbon roof and aero diffusers
      if (
        name.includes('Box001') || name.includes('Plane005') ||
        name.includes('Box002004') || name.includes('Box002.004') ||
        matName.includes('paint.001') || matName.includes('paint.004')
      ) {
        const pMat = masterPaintMaterial.clone();
        child.material = pMat;
        paintMaterialsList.push(pMat);
      } else {
        // Gloss Carbon / Obsidian aero parts (spoilers, diffusers, roof arcs)
        child.material = carbonMaterial.clone();
      }
    }
    // 8. Interior Cabin
    else if (
      name.startsWith('int') || cleanName.startsWith('int') ||
      name.startsWith('STITCH') || name.startsWith('SEAT') ||
      matName.includes('leather') || matName.includes('rubber')
    ) {
      child.material = interiorAlcantaraMaterial.clone();
    }
    // 9. Mechanical Frame & Undercarriage
    else if (
      name.startsWith('chassis') || cleanName.startsWith('chassis') ||
      name.startsWith('cooler') || cleanName.startsWith('cooler') ||
      name.startsWith('GAPFILL') || matName.includes('metal')
    ) {
      child.material = mechanicalAlloyMaterial.clone();
    }
    // Default fallback: clone original to prevent shared mutation
    else if (origMat) {
      const cloned = origMat.clone();
      cloned.envMapIntensity = 1.0;
      child.material = cloned;
    }

    upgradedMaterials.set(child, child.material);
  });

  return {
    upgradedMaterials,
    paintMaterialsList,
    emissiveMaterialsList
  };
}

/**
 * Updates primary body paint finish dynamically
 */
export function setPaintColor(colorPresetKeyOrHex) {
  let preset = CONFIG.PAINT_PRESETS[colorPresetKeyOrHex];
  let hex = preset ? preset.hex : colorPresetKeyOrHex;
  let metalness = preset ? preset.metalness : 0.88;
  let roughness = preset ? preset.roughness : 0.16;

  paintMaterialsList.forEach((mat) => {
    mat.color.set(hex);
    mat.metalness = metalness;
    mat.roughness = roughness;
    mat.needsUpdate = true;
  });
}

/**
 * Controls callout layer focus effect:
 * activeGroup stays at full opacity (with optional subtle emissive boost);
 * inactive groups fade to ~12% opacity.
 */
export function setGroupFocus(activeGroupKey, modelRoot, groupsData) {
  if (!modelRoot) return;

  modelRoot.traverse((child) => {
    if (!child.isMesh) return;

    const name = child.name;
    const cleanName = name.replace(/\./g, '');
    const parentName = child.parent && child.parent !== modelRoot ? child.parent.name : '';
    const cleanParent = parentName ? parentName.replace(/\./g, '') : '';

    const groupInfo = groupsData[name] ||
                      groupsData[cleanName] ||
                      (parentName && (groupsData[parentName] || groupsData[cleanParent])) ||
                      { group: 'misc' };

    const isTarget = (!activeGroupKey || groupInfo.group === activeGroupKey);
    const targetOpacity = isTarget ? 1.0 : 0.12;

    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => applyOpacity(m, targetOpacity, isTarget));
      } else {
        applyOpacity(child.material, targetOpacity, isTarget);
      }
    }
  });
}

function applyOpacity(material, opacity, isTarget) {
  if (opacity < 1.0) {
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
  } else {
    // If it's glass, keep its inherent transparency
    if (material.name?.toLowerCase().includes('glass') || material.opacity === 0.42) {
      material.transparent = true;
      material.opacity = 0.42;
      material.depthWrite = false;
    } else {
      material.transparent = false;
      material.opacity = 1.0;
      material.depthWrite = true;
    }
  }
}
