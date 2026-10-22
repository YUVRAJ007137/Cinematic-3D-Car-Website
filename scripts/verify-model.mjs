import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import fs from 'fs';

async function verify() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const decoder = await draco3d.createDecoderModule();
  io.registerDependencies({
    'draco3d.decoder': decoder
  });

  console.log('Loading source GLB...');
  const docSource = await io.read('source/cars_clean.glb');
  const meshesSource = docSource.getRoot().listMeshes();
  const nodesSource = docSource.getRoot().listNodes();

  console.log('Loading optimized GLB...');
  const docOpt = await io.read('public/models/veyron.glb');
  const meshesOpt = docOpt.getRoot().listMeshes();
  const nodesOpt = docOpt.getRoot().listNodes();

  console.log(`Source Meshes: ${meshesSource.length}, Optimized Meshes: ${meshesOpt.length}`);
  console.log(`Source Nodes: ${nodesSource.length}, Optimized Nodes: ${nodesOpt.length}`);

  const wheelNames = ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR'];
  console.log('\nChecking wheel nodes in optimized model:');
  for (const name of wheelNames) {
    const foundNode = nodesOpt.find(n => n.getName().includes(name));
    const foundMesh = meshesOpt.find(m => m.getName().includes(name));
    console.log(`- ${name}: Node found: ${!!foundNode} (${foundNode?.getName()}), Mesh found: ${!!foundMesh} (${foundMesh?.getName()})`);
  }

  const optSizeMB = (fs.statSync('public/models/veyron.glb').size / (1024 * 1024)).toFixed(2);
  console.log(`\nFinal file size: ${optSizeMB} MB (Target <= 15 MB)`);
}

verify().catch(console.error);
