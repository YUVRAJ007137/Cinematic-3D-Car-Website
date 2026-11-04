import * as THREE from 'three';
import { CONFIG } from './content.js';
import { getCarbonFiberTextures, getBrakeRotorTexture, getTireTreadTexture } from './procedural-textures.js';

/**
 * High-End Automotive Material Engine
 * Implements:
 * 1. Multi-tone Pearlescent & Flake Car Paint Shader (Fresnel Grazing Color & Micro-flake Sparkle)
 * 2. 2x2 Twill Woven Pre-Preg Carbon Fiber with Gloss Resin Clearcoat
 * 3. Directional Michelin-Style Rubber Tire Tread
 * 4. Cross-Drilled & Slotted Carbon-Ceramic Brake Discs with Billet Calipers
 * 5. Multi-Element Crystal Matrix Headlamps & Deep Ruby Taillight LED Blades
 * 6. Solid-Preserved Group Focus (Zero depth-sorting artifacts or ghost meshes)
 * 7. Analog Smooth X-Ray Chassis Inspection Mode (Body translucent, internals solid)
 */

const upgradedMaterials = new Map();
const paintMaterialsList = [];
const emissiveMaterialsList = [];
const carbonMaterialsList = [];
const wheelMaterialsList = [];
const caliperMaterialsList = [];
const interiorMaterialsList = [];
let modelRootRef = null;
let isXRayActive = false;
let currentFinishKey = CONFIG.DEFAULT_FINISH_KEY || 'gloss';
let currentColorKey = CONFIG.DEFAULT_COLOR_KEY || 'deep_rosso';
let currentWheelKey = CONFIG.DEFAULT_WHEEL_KEY || 'magnesium';
let currentCaliperKey = CONFIG.DEFAULT_CALIPER_KEY || 'racing_red';
let currentInteriorKey = CONFIG.DEFAULT_INTERIOR_KEY || 'pur_sport_alcantara';

export function setupMaterials(modelRoot, groupsData) {
  modelRootRef = modelRoot;
  const defaultPaint = CONFIG.PAINT_PRESETS[currentColorKey] || CONFIG.PAINT_PRESETS.deep_rosso;

  // 1. Procedural Automotive Textures
  const { normalMap: carbonNormal, roughnessMap: carbonRoughness } = getCarbonFiberTextures();
  const brakeRotorMap = getBrakeRotorTexture();
  const tireTreadMap = getTireTreadTexture();

  // 2. Multi-Tone Pearlescent & Flake Master Body Paint Material
  const masterPaintMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(defaultPaint.hex),
    metalness: defaultPaint.metalness,
    roughness: defaultPaint.roughness,
    clearcoat: defaultPaint.clearcoat ?? 1.0,
    clearcoatRoughness: defaultPaint.clearcoatRoughness ?? 0.12,
    reflectivity: 1.0,
    envMapIntensity: 2.2,
    ior: 1.54,
    sheen: 0.9,
    sheenColor: new THREE.Color(defaultPaint.accentHex || defaultPaint.hex),
    sheenRoughness: 0.25,
    iridescence: defaultPaint.pearlescent ? 0.65 : 0.25,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [120, 380]
  });

  // Inject procedural metallic micro-flake sparkle shader into paint
  masterPaintMaterial.userData.uTime = { value: 0 };
  masterPaintMaterial.userData.uGrazingColor = { value: new THREE.Color(defaultPaint.accentHex || '#ff4444') };
  masterPaintMaterial.userData.uFlakeIntensity = { value: 0.45 };

  masterPaintMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uGrazingColor = masterPaintMaterial.userData.uGrazingColor;
    shader.uniforms.uFlakeIntensity = masterPaintMaterial.userData.uFlakeIntensity;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vWorldNormalVec;
       varying vec3 vWorldViewVec;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWorldNormalVec = normalize(mat3(modelMatrix) * normal);
       vWorldViewVec = normalize(cameraPosition - (modelMatrix * vec4(transformed, 1.0)).xyz);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform vec3 uGrazingColor;
       uniform float uFlakeIntensity;
       varying vec3 vWorldNormalVec;
       varying vec3 vWorldViewVec;

       float flakeNoise(vec3 p) {
         return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
       }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       float fresnelTerm = pow(1.0 - max(dot(normalize(vWorldNormalVec), normalize(vWorldViewVec)), 0.0), 3.0);
       vec3 enhancedColor = mix(gl_FragColor.rgb, uGrazingColor * 1.25, fresnelTerm * 0.48);

       float flake = flakeNoise(vWorldNormalVec * 160.0);
       if (flake > 0.88) {
         float sparkle = pow((flake - 0.88) / 0.12, 2.0) * uFlakeIntensity * (0.6 + 0.4 * fresnelTerm);
         enhancedColor += vec3(sparkle);
       }

       gl_FragColor.rgb = enhancedColor;`
    );
  };

  // 3. Woven 2x2 Twill Pre-Preg Carbon Fiber
  const masterCarbonMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x131315),
    metalness: 0.35,
    roughness: 0.22,
    normalMap: carbonNormal,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: carbonRoughness,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    envMapIntensity: 2.0
  });

  // 4. Aero Tinted Glass (High renderOrder to sort over interior cockpit)
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0a1020),
    metalness: 0.12,
    roughness: 0.02,
    transmission: 0.0,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    envMapIntensity: 3.2,
    ior: 1.52
  });

  // 5. Headlamp Crystal Matrix
  const headlampGlowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xf0f7ff),
    emissive: new THREE.Color(0xd6e8ff),
    emissiveIntensity: 4.2,
    toneMapped: false,
    roughness: 0.1
  });

  // 6. Tail Lamp Full-Width Crimson LED Blade
  const tailLampGlowMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x2b0000),
    emissive: new THREE.Color(0xff1824),
    emissiveIntensity: 4.8,
    toneMapped: false,
    roughness: 0.15
  });

  // 7. Directional Rubber Tires
  const tireRubberMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1a1a1c),
    roughness: 0.86,
    metalness: 0.08,
    bumpMap: tireTreadMap,
    bumpScale: 0.015,
    envMapIntensity: 0.45
  });

  // 8. Cross-Drilled Carbon-Ceramic Brake Rotors
  const brakeDiscMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x94a3b8),
    metalness: 0.94,
    roughness: 0.28,
    map: brakeRotorMap,
    envMapIntensity: 2.0
  });

  // 9. Racing Monobloc Brake Caliper
  const caliperMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xdc2626),
    metalness: 0.88,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 2.2
  });

  // 10. Forged Magnesium Rim Finish
  const magnesiumRimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x18181c),
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 2.4
  });

  // 11. Mechanical Alloy & Powertrain
  const mechanicalAlloyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x4b5563),
    metalness: 0.94,
    roughness: 0.24,
    envMapIntensity: 1.8
  });

  // 12. Interior Motorsport Alcantara & Leather
  const interiorAlcantaraMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x151517),
    roughness: 0.96,
    metalness: 0.02,
    envMapIntensity: 0.3
  });

  // Traverse model and apply materials
  modelRoot.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const name = child.name;
    const cleanName = name.replace(/\./g, '');
    const parentName = child.parent && child.parent !== modelRoot ? child.parent.name : '';
    const cleanParent = parentName ? parentName.replace(/\./g, '') : '';

    const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
    const matName = (origMat?.name || '').toLowerCase();

    // 1. Manufacturer Logo Visibility
    if (name.includes('bugatti_logo') || cleanName.includes('bugatti_logo') || cleanParent.includes('bugatti_logo')) {
      child.visible = CONFIG.SHOW_LOGOS;
    }

    // 2. Wheels, Discs, Calipers & Tires
    if (name.includes('wheel') || cleanParent.includes('wheel')) {
      if (matName.includes('material_7') || matName.includes('rubber') || name.includes('tire')) {
        child.material = tireRubberMaterial.clone();
      } else if (name.includes('disc') || name.includes('rotor') || matName.includes('disc') || matName.includes('brake')) {
        child.material = brakeDiscMaterial.clone();
      } else {
        const rimMat = magnesiumRimMaterial.clone();
        child.material = rimMat;
        wheelMaterialsList.push(rimMat);
      }
    }
    // 3. Brake Calipers
    else if (name.startsWith('Caliper') || cleanName.startsWith('Caliper') || cleanParent.startsWith('Caliper')) {
      const calMat = caliperMaterial.clone();
      child.material = calMat;
      caliperMaterialsList.push(calMat);
    }
    // 4. Glass & Windshield — RenderOrder 10 guarantees proper sorting over solid cockpit!
    else if (
      name.startsWith('GLASS') || cleanName.startsWith('GLASS') ||
      matName.includes('front glass') || matName.includes('glass')
    ) {
      child.material = glassMaterial.clone();
      child.renderOrder = 10;
    }
    // 5. Headlights & Daytime LED Arrays
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
    // 7. Exterior Car Paint Panels vs Carbon Aero Surfaces
    else if (
      matName.includes('paint') || matName.includes('car paint') ||
      name === 'Box002004' || name === 'Box002.004'
    ) {
      if (
        name.includes('Box001') || name.includes('Plane005') ||
        name.includes('Box002004') || name.includes('Box002.004') ||
        matName.includes('paint.001') || matName.includes('paint.004')
      ) {
        const pMat = masterPaintMaterial.clone();
        pMat.userData.uGrazingColor = { value: new THREE.Color(defaultPaint.accentHex || '#ff4444') };
        pMat.userData.uFlakeIntensity = { value: 0.45 };
        child.material = pMat;
        paintMaterialsList.push(pMat);
      } else {
        const cMat = masterCarbonMaterial.clone();
        child.material = cMat;
        carbonMaterialsList.push(cMat);
      }
    }
    // 8. Interior Cabin
    else if (
      name.startsWith('int') || cleanName.startsWith('int') ||
      name.startsWith('STITCH') || name.startsWith('SEAT') ||
      matName.includes('leather') || matName.includes('rubber')
    ) {
      const intMat = interiorAlcantaraMaterial.clone();
      child.material = intMat;
      interiorMaterialsList.push(intMat);
    }
    // 9. Mechanical Frame, Suspension & Radiator
    else if (
      name.startsWith('chassis') || cleanName.startsWith('chassis') ||
      name.startsWith('cooler') || cleanName.startsWith('cooler') ||
      name.startsWith('GAPFILL') || matName.includes('metal')
    ) {
      child.material = mechanicalAlloyMaterial.clone();
    }
    // Default fallback
    else if (origMat) {
      const cloned = origMat.clone();
      cloned.envMapIntensity = 1.4;
      child.material = cloned;
    }

    upgradedMaterials.set(child, child.material);
  });

  return {
    upgradedMaterials,
    paintMaterialsList,
    emissiveMaterialsList,
    carbonMaterialsList
  };
}

/**
 * Updates primary body paint color and grazing accent
 */
export function setPaintColor(colorPresetKeyOrHex) {
  currentColorKey = colorPresetKeyOrHex;
  const preset = CONFIG.PAINT_PRESETS[colorPresetKeyOrHex];
  const hex = preset ? preset.hex : colorPresetKeyOrHex;
  const accentHex = preset ? (preset.accentHex || preset.hex) : '#ff4444';
  const metalness = preset ? preset.metalness : 0.88;
  const isPearlescent = preset ? !!preset.pearlescent : false;

  paintMaterialsList.forEach((mat) => {
    mat.color.set(hex);
    mat.metalness = metalness;
    mat.sheenColor.set(accentHex);
    mat.iridescence = isPearlescent ? 0.65 : 0.25;

    if (mat.userData && mat.userData.uGrazingColor) {
      if (mat.userData.uGrazingColor.value && typeof mat.userData.uGrazingColor.value.set === 'function') {
        mat.userData.uGrazingColor.value.set(accentHex);
      } else {
        mat.userData.uGrazingColor.value = new THREE.Color(accentHex);
      }
    }
    mat.needsUpdate = true;
  });

  setPaintFinish(currentFinishKey);
}

/**
 * Updates surface finish (Gloss, Satin, Matte)
 */
export function setPaintFinish(finishKey) {
  currentFinishKey = finishKey;

  paintMaterialsList.forEach((mat) => {
    if (finishKey === 'matte') {
      mat.roughness = 0.58;
      mat.clearcoat = 0.0;
      mat.clearcoatRoughness = 0.5;
      mat.metalness = 0.65;
      if (mat.userData?.uFlakeIntensity) mat.userData.uFlakeIntensity.value = 0.15;
    } else if (finishKey === 'satin') {
      mat.roughness = 0.32;
      mat.clearcoat = 0.45;
      mat.clearcoatRoughness = 0.28;
      mat.metalness = 0.82;
      if (mat.userData?.uFlakeIntensity) mat.userData.uFlakeIntensity.value = 0.35;
    } else {
      mat.roughness = 0.14;
      mat.clearcoat = 1.0;
      mat.clearcoatRoughness = 0.08;
      mat.metalness = 0.90;
      if (mat.userData?.uFlakeIntensity) mat.userData.uFlakeIntensity.value = 0.55;
    }
    mat.needsUpdate = true;
  });
  saveCustomizerState();
}

/**
 * Updates wheel rim finish (Forged Magnesium, Stealth Noir, Hyper Silver, Tuscan Bronze)
 */
export function setWheelFinish(wheelKey) {
  currentWheelKey = wheelKey;
  const preset = CONFIG.WHEEL_PRESETS[wheelKey] || CONFIG.WHEEL_PRESETS.magnesium;
  wheelMaterialsList.forEach((mat) => {
    mat.color.set(preset.hex);
    mat.metalness = preset.metalness;
    mat.roughness = preset.roughness;
    mat.needsUpdate = true;
  });
  saveCustomizerState();
}

/**
 * Updates brake caliper color
 */
export function setCaliperColor(caliperKey) {
  currentCaliperKey = caliperKey;
  const preset = CONFIG.CALIPER_PRESETS[caliperKey] || CONFIG.CALIPER_PRESETS.racing_red;
  caliperMaterialsList.forEach((mat) => {
    mat.color.set(preset.hex);
    mat.metalness = preset.metalness;
    mat.roughness = preset.roughness;
    mat.needsUpdate = true;
  });
  saveCustomizerState();
}

/**
 * Updates interior upholstery (Alcantara, Beluga Noir, Cognac Tan)
 */
export function setInteriorOption(interiorKey) {
  currentInteriorKey = interiorKey;
  const preset = CONFIG.INTERIOR_PRESETS[interiorKey] || CONFIG.INTERIOR_PRESETS.pur_sport_alcantara;
  interiorMaterialsList.forEach((mat) => {
    mat.color.set(preset.hex);
    mat.roughness = preset.roughness;
    mat.metalness = preset.metalness;
    mat.needsUpdate = true;
  });
  saveCustomizerState();
}

/**
 * Returns current customizer selections for URL and sharing
 */
export function getCustomizerState() {
  return {
    paint: currentColorKey,
    finish: currentFinishKey,
    wheels: currentWheelKey,
    calipers: currentCaliperKey,
    interior: currentInteriorKey
  };
}

/**
 * Applies a full configuration state
 */
export function applyCustomizerState(state) {
  if (!state) return;
  if (state.paint) setPaintColor(state.paint);
  if (state.finish) setPaintFinish(state.finish);
  if (state.wheels) setWheelFinish(state.wheels);
  if (state.calipers) setCaliperColor(state.calipers);
  if (state.interior) setInteriorOption(state.interior);
}

/**
 * Persists current customizer choices to URL hash & localStorage
 */
export function saveCustomizerState() {
  const state = getCustomizerState();
  const hash = `#paint=${state.paint}&finish=${state.finish}&wheels=${state.wheels}&calipers=${state.calipers}&interior=${state.interior}`;
  try {
    localStorage.setItem('customizer_config', JSON.stringify(state));
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', hash);
    }
  } catch (e) {}
}

/**
 * Loads saved customizer choices from URL hash or localStorage
 */
export function loadSavedCustomizerState() {
  const hash = window.location.hash;
  if (hash && hash.includes('paint=')) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    return {
      paint: params.get('paint') || CONFIG.DEFAULT_COLOR_KEY,
      finish: params.get('finish') || CONFIG.DEFAULT_FINISH_KEY,
      wheels: params.get('wheels') || CONFIG.DEFAULT_WHEEL_KEY,
      calipers: params.get('calipers') || CONFIG.DEFAULT_CALIPER_KEY,
      interior: params.get('interior') || CONFIG.DEFAULT_INTERIOR_KEY
    };
  }
  try {
    const saved = localStorage.getItem('customizer_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

/**
 * Analog Smooth X-Ray Chassis Inspection Mode
 * Translucent outer body panels reveal solid inner engineering without polygon artifacts!
 */
export function setXRayAmount(amount) {
  // amount: 0.0 (solid) to 1.0 (full X-Ray)
  const isXRay = amount > 0.04;
  isXRayActive = isXRay;
  if (!modelRootRef) return;

  const shellOpacity = THREE.MathUtils.lerp(1.0, 0.25, amount);

  paintMaterialsList.forEach((mat) => {
    if (isXRay) {
      mat.transparent = true;
      mat.opacity = shellOpacity;
      mat.depthWrite = true; // Essential to prevent inside-out polygon inverted sorting!
      mat.roughness = 0.14;
      mat.metalness = 0.2;
    } else {
      mat.transparent = false;
      mat.opacity = 1.0;
      mat.depthWrite = true;
      setPaintFinish(currentFinishKey);
    }
  });

  carbonMaterialsList.forEach((mat) => {
    if (isXRay) {
      mat.transparent = true;
      mat.opacity = THREE.MathUtils.lerp(1.0, 0.38, amount);
      mat.depthWrite = true;
    } else {
      mat.transparent = false;
      mat.opacity = 1.0;
      mat.depthWrite = true;
    }
  });

  // Spotlight internal powertrain, subframe, and brakes
  modelRootRef.traverse((child) => {
    if (child.isMesh && (child.name.startsWith('proc_') || child.name.includes('chassis') || child.name.includes('Caliper'))) {
      if (child.material) {
        const m = Array.isArray(child.material) ? child.material[0] : child.material;
        if (isXRay) {
          m.emissive = new THREE.Color(0x0284c7);
          m.emissiveIntensity = 0.35 * amount;
        } else {
          if (!emissiveMaterialsList.includes(m)) {
            m.emissive = new THREE.Color(0x000000);
            m.emissiveIntensity = 0.0;
          }
        }
      }
    }
  });
}

/**
 * Animate breathing pulse on daytime running lights and taillights
 */
export function animateEmissives(elapsedTime) {
  const pulse = Math.sin(elapsedTime * 2.2) * 0.4 + 1.0;
  emissiveMaterialsList.forEach((mat) => {
    mat.emissiveIntensity = 3.6 * pulse;
  });
}

/**
 * Controls callout layer focus effect:
 * PRESERVES 100% SOLIDITY AND PHYSICAL INTEGRITY OF THE VEHICLE.
 * Avoids setting 188 meshes to 0.12 opacity which creates inverted z-sorting artifacts!
 */
export function setGroupFocus(activeGroupKey, modelRoot, groupsData) {
  if (!modelRoot || isXRayActive) return;

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

    // Keep all parts 100% solid and crisp (except real glass)
    const mat = child.material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        if (!m.name?.toLowerCase().includes('glass') && m.opacity !== 0.36) {
          m.transparent = false;
          m.opacity = 1.0;
          m.depthWrite = true;

          // Subtle lighting emphasis on active layer
          if (activeGroupKey) {
            m.envMapIntensity = isTarget ? 2.5 : 1.1;
          } else {
            m.envMapIntensity = 2.0;
          }
        }
      });
    }
  });
}
