import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import fs from 'fs';

// Mock browser environment for loaders if needed or check array buffer
async function test() {
  const fileBuf = fs.readFileSync('public/models/veyron.glb');
  const arrayBuffer = fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength);

  console.log(`GLB size: ${(fileBuf.byteLength / (1024 * 1024)).toFixed(2)} MB`);
}

test();
