import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Three.js Scene, Cinematic Lighting, Environment & Camera Engine
 * Premium dark studio with atmospheric depth, reflective floor, and volumetric fog
 */

export function createScene(canvas) {
  // 1. Scene — deep dark void with exponential fog for depth
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030305);
  scene.fog = new THREE.FogExp2(0x030305, 0.065);

  // 2. Camera — cinematic low FOV for compression
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
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 4. Environment map for reflections (RoomEnvironment as studio HDRI substitute)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTexture;
  // Don't set as background — keep dark void
  roomEnv.dispose && roomEnv.dispose();

  // 5. Cinematic Lighting Rig — 5-point studio + hero sweep
  // A. Soft hemisphere ambient — very subtle fill
  const hemiLight = new THREE.HemisphereLight(0xc8d8ff, 0x08080c, 0.35);
  scene.add(hemiLight);

  // B. Key Light — large, soft, front-top-right (warm white)
  const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.8);
  keyLight.position.set(5.0, 8.0, 6.0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.0001;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.radius = 3;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 28;
  keyLight.shadow.camera.left = -4;
  keyLight.shadow.camera.right = 4;
  keyLight.shadow.camera.top = 4;
  keyLight.shadow.camera.bottom = -4;
  scene.add(keyLight);

  // C. Cool Blue Rim Light — rear-left (cinematic edge definition)
  const rimLightLeft = new THREE.DirectionalLight(0x5ea8ff, 1.4);
  rimLightLeft.position.set(-6.0, 4.0, -5.0);
  scene.add(rimLightLeft);

  // D. Warm Rim Light — rear-right (subtle counter rim)
  const rimLightRight = new THREE.DirectionalLight(0xffe8d0, 1.4);
  rimLightRight.position.set(6.0, 3.5, -4.5);
  scene.add(rimLightRight);

  // E. Under-glow Fill — subtle blue from below for car showroom feel
  const underGlow = new THREE.PointLight(0x1a4a8a, 0.8, 8, 2);
  underGlow.position.set(0, -0.3, 0);
  scene.add(underGlow);

  // F. Hero Sweep Spot Light — animated during reveal chapter
  const heroSweepLight = new THREE.SpotLight(0xffffff, 0.0, 20, Math.PI / 5, 0.85, 1.0);
  heroSweepLight.position.set(-5.0, 5.0, 4.0);
  heroSweepLight.target.position.set(0, 0.45, 0);
  scene.add(heroSweepLight);
  scene.add(heroSweepLight.target);

  // 6. Infinite Dark Floor with Radial Fade Shader
  const floorGroup = createCinematicFloor();
  scene.add(floorGroup);

  // 7. Soft Contact Shadow under car
  const contactShadowPlane = createContactShadow();
  scene.add(contactShadowPlane);

  // 8. Atmospheric Dust Particles
  if (!isMobile) {
    const particles = createAtmosphericParticles();
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
      heroSweepLight
    },
    floorGroup,
    contactShadowPlane,
    onResize
  };
}

/**
 * Dark reflective studio floor with smooth radial falloff — infinite, seamless void.
 * Uses a wide plane with an injected distance fade so it dissolves into darkness
 * with zero visible polygon or circle edges at any camera angle.
 */
function createCinematicFloor() {
  const group = new THREE.Group();

  // 120x120 plane — vast coverage to the horizon
  const floorGeo = new THREE.PlaneGeometry(120, 120, 1, 1);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x05070c,
    roughness: 0.22,
    metalness: 0.82,
    envMapIntensity: 1.1,
    transparent: true,
    depthWrite: false
  });

  // Inject radial distance fade: opacity 1.0 near the car, decaying smoothly to 0.0
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
       // Seamless cubic fade from radius 2.5 to 24.0 into dark void
       float fade = 1.0 - smoothstep(2.5, 24.0, dist);
       gl_FragColor.a *= fade;`
    );
  };

  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.002;
  floorMesh.receiveShadow = false; // Eliminates any directional shadow boundary artifacts
  group.add(floorMesh);

  return group;
}

/**
 * Soft radial contact shadow under the vehicle
 */
function createContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Multi-layered soft radial shadow with smooth decay to transparent
  const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 250);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
  grad.addColorStop(0.2, 'rgba(0, 0, 0, 0.80)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  grad.addColorStop(0.9, 'rgba(0, 0, 0, 0.03)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(4.8, 6.4);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.001, 0);
  return shadowMesh;
}

/**
 * Floating atmospheric dust particles — subtle depth and volume
 */
function createAtmosphericParticles() {
  const count = 600;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Spread particles in a large dome around the car
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = Math.random() * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    sizes[i] = 0.01 + Math.random() * 0.025;
    alphas[i] = 0.1 + Math.random() * 0.3;
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
      uColor: { value: new THREE.Color(0x6090c0) },
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
        
        // Gentle floating drift
        pos.y += sin(uTime * 0.15 + position.x * 0.5) * 0.3;
        pos.x += sin(uTime * 0.08 + position.z * 0.3) * 0.15;
        pos.z += cos(uTime * 0.1 + position.y * 0.4) * 0.12;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
        
        // Distance fade
        float dist = length(mvPosition.xyz);
        vAlpha = aAlpha * smoothstep(15.0, 2.0, dist) * 0.4;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;

      void main() {
        // Soft circle
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.userData.particleMaterial = material;
  return points;
}
