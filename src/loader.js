import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * GLTF Model Loader & Normalizer
 * Normalizes vehicle dimensions to standard unit scale, centers origin,
 * seats tires precisely on y = 0, and injects artistic powertrain internals.
 */

export async function loadCarModel(onProgress) {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    loader.load(
      '/models/veyron.glb',
      (gltf) => {
        const root = gltf.scene;

        // 1. Initial Bounding Box computation
        const initialBox = new THREE.Box3().setFromObject(root);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const initialCenter = initialBox.getCenter(new THREE.Vector3());

        // 2. Normalization: Target fixed length (Z dimension) = 4.5 units
        const TARGET_LENGTH = 4.5;
        const currentLength = Math.max(initialSize.z, 0.001);
        const scaleFactor = TARGET_LENGTH / currentLength;
        root.scale.setScalar(scaleFactor);

        // Recalculate scaled bounds
        const scaledBox = new THREE.Box3().setFromObject(root);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

        // Center on X and Z, rest bottom of tires on y = 0
        root.position.x = -scaledCenter.x;
        root.position.y = -scaledBox.min.y;
        root.position.z = -scaledCenter.z;

        // Create a root container so transforms remain clean and normalized
        const carContainer = new THREE.Group();
        carContainer.name = 'CarContainer';
        carContainer.add(root);

        // 3. Inject Artistic Procedural Powertrain Placeholder (PRD 7.4)
        const powertrainGroup = createArtisticPowertrainPlaceholder();
        root.add(powertrainGroup);

        // 4. Record rest positions and prepare pivot groups
        const partNodes = [];

        root.traverse((node) => {
          if (node.isMesh) {
            // Save initial local rest transform
            node.userData.restPosition = node.position.clone();
            node.userData.restRotation = node.rotation.clone();
            node.userData.restScale = node.scale.clone();

            // Calculate world bounding box center for organic jitter
            const box = new THREE.Box3().setFromObject(node);
            node.userData.center = box.getCenter(new THREE.Vector3());
            node.userData.size = box.getSize(new THREE.Vector3());

            partNodes.push(node);
          }
        });

        resolve({
          root,
          carContainer,
          partNodes,
          powertrainGroup,
          bounds: new THREE.Box3().setFromObject(carContainer)
        });
      },
      (xhr) => {
        if (xhr.lengthComputable && onProgress) {
          const percent = (xhr.loaded / xhr.total) * 100;
          onProgress(percent);
        }
      },
      (err) => {
        console.error('Error loading car model:', err);
        reject(err);
      }
    );
  });
}

/**
 * Procedural Powertrain & Subframe (Artistic Placeholder - PRD Section 7.4)
 * Placed behind cockpit seats, ahead of rear axle, inside vehicle monocoque.
 */
function createArtisticPowertrainPlaceholder() {
  const engineGroup = new THREE.Group();
  engineGroup.name = 'ArtisticPowertrainPlaceholder';
  engineGroup.userData.isProceduralPlaceholder = true;

  // Materials for engine components
  const darkBlockMat = new THREE.MeshStandardMaterial({
    color: 0x1f242d,
    metalness: 0.85,
    roughness: 0.35,
    name: 'EngineBlockMetal'
  });

  const brushedSilverMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.22,
    name: 'EngineBrushedAlloy'
  });

  const carbonPlenumMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.4,
    roughness: 0.25,
    clearcoat: 0.8,
    name: 'EngineCarbonPlenum'
  });

  const titaniumPipeMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.98,
    roughness: 0.15,
    name: 'ExhaustTitanium'
  });

  // Central Engine Block
  const blockGeom = new THREE.BoxGeometry(0.55, 0.42, 0.75);
  const blockMesh = new THREE.Mesh(blockGeom, darkBlockMat);
  blockMesh.position.set(0.067, 0.35, -0.45);
  blockMesh.name = 'proc_engine_crankcase';
  engineGroup.add(blockMesh);

  // Twin Angled Cylinder Head Banks (W16 style banks)
  const bankGeom = new THREE.BoxGeometry(0.24, 0.22, 0.68);
  const leftBank = new THREE.Mesh(bankGeom, brushedSilverMat);
  leftBank.position.set(0.067 - 0.26, 0.48, -0.45);
  leftBank.rotation.z = -0.38;
  leftBank.name = 'proc_cylinder_bank_left';
  engineGroup.add(leftBank);

  const rightBank = new THREE.Mesh(bankGeom, brushedSilverMat);
  rightBank.position.set(0.067 + 0.26, 0.48, -0.45);
  rightBank.rotation.z = 0.38;
  rightBank.name = 'proc_cylinder_bank_right';
  engineGroup.add(rightBank);

  // Intake Manifold Plenums (Top carbon airboxes)
  const plenumGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.62, 16);
  const leftPlenum = new THREE.Mesh(plenumGeom, carbonPlenumMat);
  leftPlenum.position.set(0.067 - 0.18, 0.62, -0.45);
  leftPlenum.rotation.x = Math.PI / 2;
  leftPlenum.name = 'proc_air_plenum_left';
  engineGroup.add(leftPlenum);

  const rightPlenum = new THREE.Mesh(plenumGeom, carbonPlenumMat);
  rightPlenum.position.set(0.067 + 0.18, 0.62, -0.45);
  rightPlenum.rotation.x = Math.PI / 2;
  rightPlenum.name = 'proc_air_plenum_right';
  engineGroup.add(rightPlenum);

  // Quad-Turbo Charger Housings (2 per side)
  const turboGeom = new THREE.TorusGeometry(0.08, 0.035, 12, 24);
  const turboPositions = [
    [-0.36, 0.42, -0.25],
    [-0.36, 0.42, -0.65],
    [0.48, 0.42, -0.25],
    [0.48, 0.42, -0.65]
  ];
  turboPositions.forEach((pos, idx) => {
    const turbo = new THREE.Mesh(turboGeom, titaniumPipeMat);
    turbo.position.set(pos[0], pos[1], pos[2]);
    turbo.rotation.y = Math.PI / 2;
    turbo.name = `proc_turbo_${idx + 1}`;
    engineGroup.add(turbo);
  });

  // Structural Subframe Longitudinal Rails (Underbody backbone)
  const railGeom = new THREE.BoxGeometry(0.06, 0.06, 2.2);
  const leftRail = new THREE.Mesh(railGeom, darkBlockMat);
  leftRail.position.set(0.067 - 0.42, 0.12, 0.1);
  leftRail.name = 'proc_subframe_rail_L';
  engineGroup.add(leftRail);

  const rightRail = new THREE.Mesh(railGeom, darkBlockMat);
  rightRail.position.set(0.067 + 0.42, 0.12, 0.1);
  rightRail.name = 'proc_subframe_rail_R';
  engineGroup.add(rightRail);

  // Transverse crossmember
  const crossGeom = new THREE.BoxGeometry(0.92, 0.05, 0.1);
  const crossMember = new THREE.Mesh(crossGeom, darkBlockMat);
  crossMember.position.set(0.067, 0.12, -0.5);
  crossMember.name = 'proc_rear_crossmember';
  engineGroup.add(crossMember);

  // Exhaust manifolds and dual rear runner pipes
  const exhaustGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.55, 12);
  const leftExhaust = new THREE.Mesh(exhaustGeom, titaniumPipeMat);
  leftExhaust.position.set(0.067 - 0.16, 0.28, -0.92);
  leftExhaust.rotation.x = Math.PI / 2.2;
  leftExhaust.name = 'proc_exhaust_runner_L';
  engineGroup.add(leftExhaust);

  const rightExhaust = new THREE.Mesh(exhaustGeom, titaniumPipeMat);
  rightExhaust.position.set(0.067 + 0.16, 0.28, -0.92);
  rightExhaust.rotation.x = Math.PI / 2.2;
  rightExhaust.name = 'proc_exhaust_runner_R';
  engineGroup.add(rightExhaust);

  // Set shadow casting
  engineGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return engineGroup;
}
