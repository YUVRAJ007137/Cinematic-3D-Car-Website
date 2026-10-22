import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import fs from 'fs';
import path from 'path';

async function dumpParts() {
  const modelPath = 'public/models/veyron.glb';
  const outputPath = 'config/parts.json';

  console.log(`Reading model from ${modelPath}...`);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const decoder = await draco3d.createDecoderModule();
  io.registerDependencies({ 'draco3d.decoder': decoder });

  const doc = await io.read(modelPath);
  const root = doc.getRoot();
  const nodes = root.listNodes().filter(n => n.getMesh() !== null);

  console.log(`Found ${nodes.length} nodes with meshes.`);

  const parts = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const mesh = node.getMesh();
    const bounds = getBounds(node);

    const min = bounds.min;
    const max = bounds.max;
    const center = [
      Number(((min[0] + max[0]) / 2).toFixed(5)),
      Number(((min[1] + max[1]) / 2).toFixed(5)),
      Number(((min[2] + max[2]) / 2).toFixed(5))
    ];
    const size = [
      Number(Math.abs(max[0] - min[0]).toFixed(5)),
      Number(Math.abs(max[1] - min[1]).toFixed(5)),
      Number(Math.abs(max[2] - min[2]).toFixed(5))
    ];

    let triCount = 0;
    const materials = new Set();

    mesh.listPrimitives().forEach(primitive => {
      const idx = primitive.getIndices();
      const pos = primitive.getAttribute('POSITION');
      if (idx) {
        triCount += Math.round(idx.getCount() / 3);
      } else if (pos) {
        triCount += Math.round(pos.getCount() / 3);
      }

      const mat = primitive.getMaterial();
      if (mat) {
        materials.add(mat.getName() || 'unnamed_material');
      }
    });

    parts.push({
      id: i,
      name: node.getName(),
      meshName: mesh.getName(),
      center,
      size,
      bounds: {
        min: [Number(min[0].toFixed(5)), Number(min[1].toFixed(5)), Number(min[2].toFixed(5))],
        max: [Number(max[0].toFixed(5)), Number(max[1].toFixed(5)), Number(max[2].toFixed(5))]
      },
      triangles: triCount,
      materials: Array.from(materials)
    });
  }

  // Ensure config directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(parts, null, 2));

  console.log(`Saved ${parts.length} parts to ${outputPath}`);
}

dumpParts().catch(err => {
  console.error('Error dumping parts:', err);
  process.exit(1);
});
