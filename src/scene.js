import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Three.js Scene, Cinematic Lighting, Ground Reflector & Camera Engine
 */

export function createScene(canvas) {
  // 1. Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060609);
  scene.fog = new THREE.FogExp2(0x060609, 0.045);

  // 2. Camera
  const camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  // Default hero reveal position
  camera.position.set(3.8, 1.3, 3.8);
  const cameraTarget = new THREE.Vector3(0, 0.45, 0);
  camera.lookAt(cameraTarget);

  // 3. Renderer with ACES Filmic Tone Mapping & Color Management
  const isMobile = window.innerWidth <= 768;
  const maxPixelRatio = isMobile ? 1.5 : 2.0;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 4. Room Environment Reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTexture;

  // 5. Cinematic Lighting Rig
  // A. Hemisphere Ambient Fill
  const hemiLight = new THREE.HemisphereLight(0xe0e7ff, 0x09090f, 0.55);
  scene.add(hemiLight);

  // B. Large Soft Key Light (Front-Top-Right)
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(4.5, 7.0, 5.0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.00015;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 25;
  keyLight.shadow.camera.left = -3.5;
  keyLight.shadow.camera.right = 3.5;
  keyLight.shadow.camera.top = 3.5;
  keyLight.shadow.camera.bottom = -3.5;
  scene.add(keyLight);

  // C. Cool Blue Rim Light (Rear-Left)
  const rimLightLeft = new THREE.DirectionalLight(0x70b8ff, 2.6);
  rimLightLeft.position.set(-5.5, 3.8, -4.5);
  scene.add(rimLightLeft);

  // D. Crisp White Rim Light (Rear-Right)
  const rimLightRight = new THREE.DirectionalLight(0xfff5ea, 1.8);
  rimLightRight.position.set(5.5, 3.2, -4.0);
  scene.add(rimLightRight);

  // E. Dramatic Hero Sweep Spot Light (Chapters 1 & 2)
  const heroSweepLight = new THREE.SpotLight(0xffffff, 0.0, 18, Math.PI / 4, 0.8, 1.2);
  heroSweepLight.position.set(-4.0, 4.5, 3.5);
  heroSweepLight.target.position.set(0, 0.45, 0);
  scene.add(heroSweepLight);
  scene.add(heroSweepLight.target);

  // 6. Glossy Floor with Edge Fade & Contact Shadow
  const floorGroup = createReflectiveGlossFloor();
  scene.add(floorGroup);

  // Contact shadow texture plane under car
  const contactShadowPlane = createContactShadow();
  scene.add(contactShadowPlane);

  // 7. Window Resize Listener
  function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
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
      heroSweepLight
    },
    floorGroup,
    contactShadowPlane,
    onResize
  };
}

/**
 * Creates dark glossy floor with radial opacity fade to black
 */
function createReflectiveGlossFloor() {
  const group = new THREE.Group();

  // Dark reflective base mesh
  const floorGeo = new THREE.PlaneGeometry(28, 28, 32, 32);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x07080b,
    roughness: 0.18,
    metalness: 0.82,
    envMapIntensity: 1.1
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.005;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Grid accent for depth & scale
  const grid = new THREE.GridHelper(24, 48, 0x1e293b, 0x0d1117);
  grid.position.y = -0.003;
  group.add(grid);

  return group;
}

/**
 * Procedural Contact Shadow gradient plane directly under vehicle
 */
function createContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Radial blur gradient
  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 240);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
  grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.7)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(3.6, 5.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.002;
  shadowMesh.position.x = 0;
  shadowMesh.position.z = 0;
  return shadowMesh;
}
