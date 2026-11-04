import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

/**
 * High-End Automotive Studio Scene Engine
 * Features:
 * 1. Bespoke Automotive Studio Softbox Cyclorama Environment (PMREM)
 * 2. True Planar Ground Reflection with Depth Fade & Floor Underglow
 * 3. Twin Front Headlamp Projector Floor Beams with Ignition Animation
 * 4. Multi-Point Studio Key, Rim & Fill Rig with Dynamic Sweep
 * 5. Multi-Layer Contact Shadow & Interactive Atmospheric Dust
 */

export function createScene(canvas) {
  // 1. Scene — deep dark void with exponential fog for depth
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040508);
  scene.fog = new THREE.FogExp2(0x040508, 0.055);

  // 2. Camera — cinematic low FOV for automotive telephoto compression
  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    120
  );
  camera.position.set(3.8, 1.3, 3.8);
  const cameraTarget = new THREE.Vector3(0, 0.45, 0);
  camera.lookAt(cameraTarget);

  // 3. Renderer — ACES Filmic, capped pixel ratio, PCF shadows
  const isMobile = window.innerWidth <= 768;
  const maxPixelRatio = isMobile ? 1.5 : 2.0;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 4. Bespoke Automotive Studio Softbox Lighting Rig (PMREM)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const studioEnvTexture = createAutomotiveStudioEnvironment(pmremGenerator);
  scene.environment = studioEnvTexture;

  // 5. Studio Lighting Rig
  // A. Soft hemisphere ambient
  const hemiLight = new THREE.HemisphereLight(0xd4e2ff, 0x080a12, 0.45);
  scene.add(hemiLight);

  // B. Main Studio Overhead Key Light (Warm softbox feel)
  const keyLight = new THREE.DirectionalLight(0xfffaf4, 2.2);
  keyLight.position.set(4.5, 8.5, 5.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.0001;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.radius = 3.5;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 28;
  keyLight.shadow.camera.left = -4;
  keyLight.shadow.camera.right = 4;
  keyLight.shadow.camera.top = 4;
  keyLight.shadow.camera.bottom = -4;
  scene.add(keyLight);

  // C. Cool Blue Rim Light — rear-left (cinematic edge definition)
  const rimLightLeft = new THREE.DirectionalLight(0x38bdf8, 1.8);
  rimLightLeft.position.set(-6.0, 4.0, -5.0);
  scene.add(rimLightLeft);

  // D. Warm Amber/Gold Rim Light — rear-right (sculptural contour)
  const rimLightRight = new THREE.DirectionalLight(0xffedd5, 1.6);
  rimLightRight.position.set(6.0, 3.5, -4.5);
  scene.add(rimLightRight);

  // E. Under-glow Fill — subtle azure bounce from below
  const underGlow = new THREE.PointLight(0x0284c7, 1.2, 9, 2);
  underGlow.position.set(0, -0.2, 0);
  scene.add(underGlow);

  // F. Hero Sweep Spot Light — animated during reveal chapter
  const heroSweepLight = new THREE.SpotLight(0xffffff, 0.0, 24, Math.PI / 4.5, 0.88, 1.0);
  heroSweepLight.position.set(-5.0, 5.0, 4.0);
  heroSweepLight.target.position.set(0, 0.45, 0);
  scene.add(heroSweepLight);
  scene.add(heroSweepLight.target);

  // F2. Precision Cinema Strip Light — razor-sharp light slice for Chapter 1 silhouette & Chapter 6 paint reveals
  const stripLight = new THREE.SpotLight(0xf1f5f9, 0.0, 28, Math.PI / 9, 0.18, 1.1);
  stripLight.position.set(-6.0, 2.2, 3.2);
  stripLight.target.position.set(-5.0, 0.45, 0);
  scene.add(stripLight);
  scene.add(stripLight.target);

  // G. Twin Front Headlamp Floor Projector Beams & Anamorphic Flares
  const { leftBeam, rightBeam, leftFlare, rightFlare } = createHeadlightFloorBeams(scene);

  // 6. Real-Time Ground Reflector & Infinite Dark Floor
  const floorGroup = createReflectiveShowroomFloor(renderer, isMobile);
  scene.add(floorGroup);

  // 7. Multi-Layer Contact Shadow under car
  const contactShadowPlane = createContactShadow();
  scene.add(contactShadowPlane);

  // 8. Atmospheric Dust Particles
  let particles = null;
  if (!isMobile) {
    particles = createAtmosphericParticles();
    scene.add(particles);
  }

  // 9. Resize
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return {
    scene,
    camera,
    cameraTarget,
    renderer,
    lights: {
      hemiLight,
      keyLight,
      rimLightLeft,
      rimLightRight,
      underGlow,
      heroSweepLight,
      stripLight,
      leftHeadlightBeam: leftBeam,
      rightHeadlightBeam: rightBeam,
      leftFlare,
      rightFlare
    },
    floorGroup,
    contactShadowPlane,
    particles,
    onResize,
    setBackgroundTint(colorHex) {
      if (!colorHex) return;
      const baseColor = new THREE.Color(colorHex);
      const deepTint = baseColor.clone().multiplyScalar(0.045);
      scene.background.lerp(deepTint, 0.12);
      if (scene.fog) {
        scene.fog.color.lerp(deepTint, 0.12);
      }
    }
  };
}

/**
 * Generates a bespoke automotive showroom environment using a PMREM cyclorama rig.
 * Long overhead strip softboxes create realistic continuous reflections down the vehicle curves.
 */
function createAutomotiveStudioEnvironment(pmremGenerator) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x030408);

  // 1. Long Overhead Strip Softbox (Signature automotive roof reflection)
  const overheadSoftboxGeo = new THREE.PlaneGeometry(3.5, 14.0);
  const overheadSoftboxMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });
  const overheadSoftbox = new THREE.Mesh(overheadSoftboxGeo, overheadSoftboxMat);
  overheadSoftbox.rotation.x = Math.PI / 2;
  overheadSoftbox.position.set(0, 6.5, 0);
  envScene.add(overheadSoftbox);

  // 2. Left Lateral Shoulder Softbox (High-contrast shoulder line definition)
  const leftSoftboxGeo = new THREE.PlaneGeometry(12.0, 2.8);
  const leftSoftboxMat = new THREE.MeshBasicMaterial({
    color: 0xd6e8ff,
    side: THREE.DoubleSide
  });
  const leftSoftbox = new THREE.Mesh(leftSoftboxGeo, leftSoftboxMat);
  leftSoftbox.rotation.y = Math.PI / 2;
  leftSoftbox.rotation.z = 0.25;
  leftSoftbox.position.set(-6.0, 3.2, 0);
  envScene.add(leftSoftbox);

  // 3. Right Lateral Shoulder Softbox
  const rightSoftboxGeo = new THREE.PlaneGeometry(12.0, 2.8);
  const rightSoftboxMat = new THREE.MeshBasicMaterial({
    color: 0xfff0e4,
    side: THREE.DoubleSide
  });
  const rightSoftbox = new THREE.Mesh(rightSoftboxGeo, rightSoftboxMat);
  rightSoftbox.rotation.y = -Math.PI / 2;
  rightSoftbox.rotation.z = -0.25;
  rightSoftbox.position.set(6.0, 3.2, 0);
  envScene.add(rightSoftbox);

  // 4. Front Radiator Key Softbox
  const frontSoftboxGeo = new THREE.PlaneGeometry(4.0, 2.5);
  const frontSoftboxMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    side: THREE.DoubleSide
  });
  const frontSoftbox = new THREE.Mesh(frontSoftboxGeo, frontSoftboxMat);
  frontSoftbox.position.set(0, 2.5, 7.5);
  frontSoftbox.rotation.y = Math.PI;
  envScene.add(frontSoftbox);

  // 5. Rear Spoiler Rim Softbox
  const rearSoftboxGeo = new THREE.PlaneGeometry(4.0, 2.0);
  const rearSoftboxMat = new THREE.MeshBasicMaterial({
    color: 0xff2020,
    side: THREE.DoubleSide
  });
  const rearSoftbox = new THREE.Mesh(rearSoftboxGeo, rearSoftboxMat);
  rearSoftbox.position.set(0, 2.2, -7.5);
  envScene.add(rearSoftbox);

  const envTexture = pmremGenerator.fromScene(envScene, 0.04).texture;
  return envTexture;
}

/**
 * True Planar Ground Reflector + Infinite Seamless Fading Void
 */
function createReflectiveShowroomFloor(renderer, isMobile) {
  const group = new THREE.Group();

  // 1. Reflector Plane (True mirror reflection of wheels, paint, red taillights)
  if (!isMobile) {
    const reflectorGeo = new THREE.PlaneGeometry(24, 24);
    const reflector = new Reflector(reflectorGeo, {
      clipBias: 0.003,
      textureWidth: Math.floor(window.innerWidth * 0.75),
      textureHeight: Math.floor(window.innerHeight * 0.75),
      color: 0x090c14
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = -0.003;

    // Inject distance radial falloff into Reflector material so mirror dissolves gracefully
    if (reflector.material && reflector.material.onBeforeCompile) {
      reflector.material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vWorldRefPos;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `#include <project_vertex>
           vWorldRefPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vWorldRefPos;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           float dist = length(vWorldRefPos.xz);
           float fade = 1.0 - smoothstep(1.8, 8.5, dist);
           gl_FragColor.rgb *= (0.45 * fade);`
        );
      };
    }
    group.add(reflector);
  }

  // 2. Infinite Dark Studio Floor Base (120x120) with smooth radial falloff
  const floorGeo = new THREE.PlaneGeometry(120, 120, 1, 1);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x040508,
    roughness: 0.28,
    metalness: 0.75,
    envMapIntensity: 1.2,
    transparent: true,
    depthWrite: false
  });

  floorMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vCustomWorldPos;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vCustomWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vCustomWorldPos;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       float dist = length(vCustomWorldPos.xz);
       float fade = 1.0 - smoothstep(2.5, 24.0, dist);
       gl_FragColor.a *= fade;`
    );
  };

  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.002;
  floorMesh.receiveShadow = false;
  group.add(floorMesh);

  return group;
}

/**
 * Soft multi-stop radial contact shadow under the vehicle
 */
function createContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(256, 256, 12, 256, 256, 250);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
  grad.addColorStop(0.25, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.48)');
  grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.16)');
  grad.addColorStop(0.92, 'rgba(0, 0, 0, 0.03)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(4.8, 6.4);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.001, 0);
  return shadowMesh;
}

/**
 * Twin Front Headlamp Floor Projector Beams & Anamorphic Horizontal Flares
 */
function createHeadlightFloorBeams(scene) {
  const leftBeam = new THREE.SpotLight(0xdbeafe, 0.0, 16, Math.PI / 5.5, 0.8, 1.2);
  leftBeam.position.set(0.55, 0.65, 1.8);
  leftBeam.target.position.set(0.55, 0.0, 5.5);
  scene.add(leftBeam);
  scene.add(leftBeam.target);

  const rightBeam = new THREE.SpotLight(0xdbeafe, 0.0, 16, Math.PI / 5.5, 0.8, 1.2);
  rightBeam.position.set(-0.55, 0.65, 1.8);
  rightBeam.target.position.set(-0.55, 0.0, 5.5);
  scene.add(rightBeam);
  scene.add(rightBeam.target);

  // Horizontal Anamorphic Blue Flare Sprites
  const flareCanvas = document.createElement('canvas');
  flareCanvas.width = 256;
  flareCanvas.height = 32;
  const ctx = flareCanvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 16, 0, 128, 16, 128);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(56, 189, 248, 0.85)');
  grad.addColorStop(0.6, 'rgba(14, 165, 233, 0.25)');
  grad.addColorStop(1, 'rgba(2, 132, 199, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 32);

  const flareTex = new THREE.CanvasTexture(flareCanvas);
  const flareMat = new THREE.SpriteMaterial({
    map: flareTex,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const leftFlare = new THREE.Sprite(flareMat);
  leftFlare.position.set(0.55, 0.65, 1.85);
  leftFlare.scale.set(1.1, 0.05, 1.0);
  scene.add(leftFlare);

  const rightFlare = new THREE.Sprite(flareMat.clone());
  rightFlare.position.set(-0.55, 0.65, 1.85);
  rightFlare.scale.set(1.1, 0.05, 1.0);
  scene.add(rightFlare);

  return { leftBeam, rightBeam, leftFlare, rightFlare };
}

/**
 * Floating atmospheric dust particles — subtle depth and interactive volume
 */
function createAtmosphericParticles() {
  const count = 750;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = Math.random() * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 22;

    sizes[i] = 0.012 + Math.random() * 0.028;
    alphas[i] = 0.12 + Math.random() * 0.35;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x38bdf8) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;

      void main() {
        vec3 pos = position;
        pos.y += sin(uTime * 0.18 + position.x * 0.4) * 0.35;
        pos.x += sin(uTime * 0.10 + position.z * 0.3) * 0.2;
        pos.z += cos(uTime * 0.12 + position.y * 0.35) * 0.18;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * uPixelRatio * (220.0 / -mvPosition.z);

        float dist = length(mvPosition.xyz);
        vAlpha = aAlpha * smoothstep(16.0, 2.0, dist) * 0.45;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.08, d) * vAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData.particleMaterial = material;
  return points;
}
