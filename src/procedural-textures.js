import * as THREE from 'three';

/**
 * Procedural Texture Generator
 * Generates high-fidelity automotive textures dynamically in-memory (zero external downloads):
 * 1. 2x2 Twill Carbon Fiber Weave (normal & roughness map)
 * 2. Cross-drilled & slotted racing brake rotor disc
 * 3. Directional tire tread & sidewall texture
 */

let cachedCarbonNormal = null;
let cachedCarbonRoughness = null;
let cachedBrakeDiscTexture = null;
let cachedTireTexture = null;

/**
 * 2x2 Twill Carbon Fiber Normal & Roughness Map
 */
export function getCarbonFiberTextures() {
  if (cachedCarbonNormal && cachedCarbonRoughness) {
    return { normalMap: cachedCarbonNormal, roughnessMap: cachedCarbonRoughness };
  }

  const size = 512;
  const canvasN = document.createElement('canvas');
  canvasN.width = size;
  canvasN.height = size;
  const ctxN = canvasN.getContext('2d');

  const canvasR = document.createElement('canvas');
  canvasR.width = size;
  canvasR.height = size;
  const ctxR = canvasR.getContext('2d');

  const imgDataN = ctxN.createImageData(size, size);
  const dataN = imgDataN.data;

  const imgDataR = ctxR.createImageData(size, size);
  const dataR = imgDataR.data;

  const tileSize = 16;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const tx = Math.floor(x / tileSize);
      const ty = Math.floor(y / tileSize);
      const isDiagonal = ((tx + ty) % 4 < 2);

      const lx = (x % tileSize) / tileSize;
      const ly = (y % tileSize) / tileSize;

      let nx = 128;
      let ny = 128;
      let nz = 255;
      let roughness = 120;

      if (isDiagonal) {
        // Horizontal fiber bundle
        const curve = Math.sin(ly * Math.PI);
        ny = Math.round(128 + (ly - 0.5) * 80);
        nx = 128;
        roughness = 100 + Math.round(curve * 60);
      } else {
        // Vertical fiber bundle
        const curve = Math.sin(lx * Math.PI);
        nx = Math.round(128 + (lx - 0.5) * 80);
        ny = 128;
        roughness = 100 + Math.round(curve * 60);
      }

      // Normal Map (RGB)
      dataN[idx] = nx;
      dataN[idx + 1] = ny;
      dataN[idx + 2] = nz;
      dataN[idx + 3] = 255;

      // Roughness Map (grayscale)
      dataR[idx] = roughness;
      dataR[idx + 1] = roughness;
      dataR[idx + 2] = roughness;
      dataR[idx + 3] = 255;
    }
  }

  ctxN.putImageData(imgDataN, 0, 0);
  ctxR.putImageData(imgDataR, 0, 0);

  const normalTex = new THREE.CanvasTexture(canvasN);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(18, 18);
  normalTex.needsUpdate = true;

  const roughnessTex = new THREE.CanvasTexture(canvasR);
  roughnessTex.wrapS = THREE.RepeatWrapping;
  roughnessTex.wrapT = THREE.RepeatWrapping;
  roughnessTex.repeat.set(18, 18);
  roughnessTex.needsUpdate = true;

  cachedCarbonNormal = normalTex;
  cachedCarbonRoughness = roughnessTex;

  return { normalMap: cachedCarbonNormal, roughnessMap: cachedCarbonRoughness };
}

/**
 * Procedural Cross-Drilled & Slotted Carbon-Ceramic Brake Rotor Texture
 */
export function getBrakeRotorTexture() {
  if (cachedBrakeDiscTexture) return cachedBrakeDiscTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // 1. Dark graphite circular background
  ctx.fillStyle = '#23262d';
  ctx.fillRect(0, 0, size, size);

  // 2. Concentric micro-groove radial rings
  for (let r = 70; r < 240; r += 1.5) {
    const alpha = 0.05 + Math.random() * 0.12;
    ctx.strokeStyle = `rgba(220, 225, 235, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Curved brake slots (cooling vanes)
  ctx.strokeStyle = 'rgba(15, 17, 23, 0.7)';
  ctx.lineWidth = 3.5;
  const numSlots = 14;
  for (let i = 0; i < numSlots; i++) {
    const angle = (i / numSlots) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 180, angle, angle + 0.38, false);
    ctx.stroke();
  }

  // 4. Cross-drilled holes in spiral arrays
  const numSpirals = 16;
  ctx.fillStyle = '#08090c';
  for (let i = 0; i < numSpirals; i++) {
    const baseAngle = (i / numSpirals) * Math.PI * 2;
    for (let step = 0; step < 5; step++) {
      const radius = 95 + step * 26;
      const angle = baseAngle + step * 0.12;
      const hx = cx + Math.cos(angle) * radius;
      const hy = cy + Math.sin(angle) * radius;

      // Dark hole
      ctx.beginPath();
      ctx.arc(hx, hy, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // Chamfer edge highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx, hy, 4.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  cachedBrakeDiscTexture = texture;
  return cachedBrakeDiscTexture;
}

/**
 * Procedural Directional High-Performance Tire Tread Texture
 */
export function getTireTreadTexture() {
  if (cachedTireTexture) return cachedTireTexture;

  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Dark rubber base
  ctx.fillStyle = '#1c1c1f';
  ctx.fillRect(0, 0, width, height);

  // Longitudinal water evacuation channels
  const channels = [80, 160, 240, 320, 400];
  ctx.fillStyle = '#0a0a0c';
  channels.forEach((x) => {
    ctx.fillRect(x - 8, 0, 16, height);
  });

  // Diagonal tread sipes
  ctx.strokeStyle = '#0e0e11';
  ctx.lineWidth = 4;
  for (let y = -50; y < height + 50; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(240, y + 45);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width, y);
    ctx.lineTo(240, y + 45);
    ctx.stroke();
  }

  // Micro-roughness noise
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    ctx.fillRect(rx, ry, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 10);
  texture.needsUpdate = true;
  cachedTireTexture = texture;
  return cachedTireTexture;
}
