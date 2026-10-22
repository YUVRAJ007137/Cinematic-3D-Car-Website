import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Polyfill minimal browser globals for GLTFLoader in Node
if (typeof self === 'undefined') globalThis.self = globalThis;
if (typeof window === 'undefined') globalThis.window = globalThis;

const glbBuffer = fs.readFileSync('public/models/veyron.glb');
const arrayBuffer = glbBuffer.buffer.slice(glbBuffer.byteOffset, glbBuffer.byteOffset + glbBuffer.byteLength);

const loader = new GLTFLoader();
loader.parse(
  arrayBuffer,
  '',
  (gltf) => {
    console.log('Scene parsed successfully!');
    let totalNodes = 0;
    let totalMeshes = 0;
    let totalGroups = 0;

    const topChildren = [];
    gltf.scene.children.forEach(c => {
      topChildren.push({
        name: c.name,
        type: c.type,
        childrenCount: c.children.length
      });
    });

    console.log('Direct children of scene:', gltf.scene.children.length);
    console.log('Sample top children:', topChildren.slice(0, 10));

    const wheels = [];
    gltf.scene.traverse(node => {
      totalNodes++;
      if (node.isMesh) totalMeshes++;
      if (node.isGroup) totalGroups++;
      if (node.name.includes('wheel') || (node.parent && node.parent.name.includes('wheel'))) {
        wheels.push({
          name: node.name,
          type: node.type,
          parentName: node.parent?.name,
          userData: node.userData
        });
      }
    });

    console.log(`Total nodes: ${totalNodes}, Groups: ${totalGroups}, Meshes: ${totalMeshes}`);
    console.log('\nWheel hierarchy:');
    console.log(wheels);
  },
  (err) => {
    console.error('Error parsing GLTF in Node:', err);
  }
);
