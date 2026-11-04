import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateExplodedPos } from '../src/math-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadJSON(relPath) {
  const p = resolve(root, relPath);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8'));
}

describe('config/explode.json Configuration Integrity', () => {
  const explode = loadJSON('config/explode.json');

  it('successfully loads explode configuration', () => {
    assert.ok(explode !== null);
    assert.equal(typeof explode, 'object');
  });

  const expectedGroups = ['body_panels', 'glass_and_lights', 'interior', 'mechanical', 'brakes', 'wheels'];

  expectedGroups.forEach((groupName) => {
    it(`contains configured subsystem group: ${groupName}`, () => {
      assert.ok(groupName in explode);
      const cfg = explode[groupName];
      assert.equal(cfg.direction.length, 3);
      assert.equal(typeof cfg.distance, 'number');
      assert.ok(cfg.distance > 0);
      assert.ok(cfg.start >= 0);
      assert.ok(cfg.end <= 1);
      assert.ok(cfg.start < cfg.end);
    });
  });
});

describe('config/groups.json Subsystem Mapping', () => {
  const groups = loadJSON('config/groups.json');

  it('loads mesh grouping mappings with high node count', () => {
    assert.ok(groups !== null);
    const count = Object.keys(groups).length;
    assert.ok(count > 100);
  });

  it('maps known primary vehicle meshes to correct subsystems', () => {
    assert.equal(groups['wheel_FL']?.group, 'wheels');
    assert.equal(groups['Caliper_039.001']?.group, 'brakes');
    assert.equal(groups['LIGHT_GLOW.001']?.group, 'glass_and_lights');
  });
});

describe('Exploded View Part Displacement Arithmetic', () => {
  it('leaves rest position unchanged at 0 factor', () => {
    const rest = [1.2, 0.5, -0.8];
    const dir = [0, 1, 0];
    const res = calculateExplodedPos(rest, dir, 1.5, 0.0);
    assert.deepEqual(res, rest);
  });

  it('translates part along direction vector proportionally', () => {
    const rest = [0, 0, 0];
    const dir = [0, 1, 0];
    const res = calculateExplodedPos(rest, dir, 2.0, 0.5);
    assert.deepEqual(res, [0, 1.0, 0]);
  });

  it('incorporates micro-jitter correctly', () => {
    const rest = [0, 0, 0];
    const dir = [1, 0, 0];
    const res = calculateExplodedPos(rest, dir, 1.0, 1.0, [0.05, -0.02, 0.01]);
    assert.ok(Math.abs(res[0] - 1.05) < 0.0001);
    assert.ok(Math.abs(res[1] - (-0.02)) < 0.0001);
    assert.ok(Math.abs(res[2] - 0.01) < 0.0001);
  });
});
