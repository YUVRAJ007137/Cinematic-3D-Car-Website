import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const input = 'source/cars_clean.glb';
const output = 'public/models/veyron.glb';

console.log('--- Starting Model Optimization (Phase 0) ---');
console.log(`Input: ${input}`);
console.log(`Output: ${output}`);

if (!fs.existsSync(input)) {
  console.error(`Input file not found: ${input}`);
  process.exit(1);
}

const inputStat = fs.statSync(input);
console.log(`Input file size: ${(inputStat.size / (1024 * 1024)).toFixed(2)} MB`);

// Build CLI command: Draco compression, WebP texture compression (max 2048),
// NEVER join, flatten, simplify, instance or palette meshes/nodes/materials.
const cmd = [
  'npx',
  '@gltf-transform/cli',
  'optimize',
  `"${input}"`,
  `"${output}"`,
  '--compress', 'draco',
  '--texture-compress', 'webp',
  '--texture-size', '2048',
  '--join', 'false',
  '--flatten', 'false',
  '--simplify', 'false',
  '--instance', 'false',
  '--palette', 'false'
].join(' ');

console.log(`Executing: ${cmd}`);
try {
  execSync(cmd, { stdio: 'inherit' });
  const outputStat = fs.statSync(output);
  const sizeMB = outputStat.size / (1024 * 1024);
  console.log(`Optimization complete! Output file size: ${sizeMB.toFixed(2)} MB`);

  if (sizeMB > 15) {
    console.warn(`Target is 15 MB or less, but size is ${sizeMB.toFixed(2)} MB. Retrying with --texture-size 1024...`);
    const cmd1024 = [
      'npx',
      '@gltf-transform/cli',
      'optimize',
      `"${input}"`,
      `"${output}"`,
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--join', 'false',
      '--flatten', 'false',
      '--simplify', 'false',
      '--instance', 'false',
      '--palette', 'false'
    ].join(' ');
    execSync(cmd1024, { stdio: 'inherit' });
    const outputStat1024 = fs.statSync(output);
    const sizeMB1024 = outputStat1024.size / (1024 * 1024);
    console.log(`Retry complete! Output file size: ${sizeMB1024.toFixed(2)} MB`);
  }
} catch (err) {
  console.error('Optimization failed:', err);
  process.exit(1);
}
