import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadCameraConfig() {
  const p = resolve(root, 'config/camera.json');
  return JSON.parse(readFileSync(p, 'utf-8'));
}

describe('config/camera.json Keyframe Schema & Integrity', () => {
  const config = loadCameraConfig();
  const kfs = config.keyframes;

  it('loads non-empty keyframe list', () => {
    assert.ok(Array.isArray(kfs));
    assert.ok(kfs.length >= 10);
  });

  it('progress stamps are strictly monotonically increasing in [0, 1]', () => {
    assert.equal(kfs[0].p, 0.0);
    assert.equal(kfs[kfs.length - 1].p, 1.0);

    for (let i = 1; i < kfs.length; i++) {
      assert.ok(
        kfs[i].p >= kfs[i - 1].p,
        `Keyframe ${i} progress ${kfs[i].p} is less than previous ${kfs[i - 1].p}`
      );
    }
  });

  it('all keyframes have valid 3D positions, targets, and FOVs', () => {
    kfs.forEach((kf, idx) => {
      assert.equal(kf.pos.length, 3, `Keyframe ${idx} pos should be 3D`);
      assert.equal(kf.target.length, 3, `Keyframe ${idx} target should be 3D`);
      kf.pos.forEach(val => assert.ok(Number.isFinite(val)));
      kf.target.forEach(val => assert.ok(Number.isFinite(val)));

      assert.ok(kf.fov >= 10 && kf.fov <= 80, `Keyframe ${idx} fov out of range: ${kf.fov}`);
      assert.ok(Math.abs(kf.roll || 0) <= 2.0, `Keyframe ${idx} roll too large: ${kf.roll}`);
      assert.ok((kf.handheldAmp ?? 0) <= 0.015, `Keyframe ${idx} handheld too large`);
    });
  });

  it('covers all 6 chapters across the timeline', () => {
    const chapters = new Set(kfs.map(k => k.chapter));
    assert.equal(chapters.size, 6, 'Should span chapters 0 through 5');
  });

  it('Hitchcock Dolly Zoom in Chapter 3 preserves apparent object size within ~5%', () => {
    // Dolly zoom keyframes at p = 0.31 and p = 0.36
    const kfStart = kfs.find(k => k.p === 0.31);
    const kfEnd = kfs.find(k => k.p === 0.36);

    assert.ok(kfStart, 'Should find dolly zoom start keyframe at 0.31');
    assert.ok(kfEnd, 'Should find dolly zoom end keyframe at 0.36');

    // Distance calculation: ||pos - target||
    const distStart = Math.hypot(
      kfStart.pos[0] - kfStart.target[0],
      kfStart.pos[1] - kfStart.target[1],
      kfStart.pos[2] - kfStart.target[2]
    );
    const distEnd = Math.hypot(
      kfEnd.pos[0] - kfEnd.target[0],
      kfEnd.pos[1] - kfEnd.target[1],
      kfEnd.pos[2] - kfEnd.target[2]
    );

    // Apparent size scale factor: s = dist * tan(fov / 2)
    const scaleStart = distStart * Math.tan((kfStart.fov * Math.PI) / 360.0);
    const scaleEnd = distEnd * Math.tan((kfEnd.fov * Math.PI) / 360.0);

    const relativeDiff = Math.abs(scaleStart - scaleEnd) / scaleStart;
    assert.ok(
      relativeDiff < 0.05,
      `Dolly zoom size deviation ${ (relativeDiff * 100).toFixed(2) }% exceeds 5% tolerance`
    );
  });
});
