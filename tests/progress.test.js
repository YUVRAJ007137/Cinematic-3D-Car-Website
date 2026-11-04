import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getChapterFromProgress, computePchipTangents, evalHermiteSpline } from '../src/math-utils.js';

describe('Scroll Progress to Chapter Resolution', () => {
  it('identifies chapter 1 (The Reveal) at progress 0.00', () => {
    const ch = getChapterFromProgress(0.00);
    assert.equal(ch.name, 'reveal');
    assert.equal(ch.index, 0);
  });

  it('identifies chapter 2 (The Orbit) at progress 0.18', () => {
    const ch = getChapterFromProgress(0.18);
    assert.equal(ch.name, 'orbit');
    assert.equal(ch.index, 1);
  });

  it('identifies chapter 3 (The Dolly Zoom) at progress 0.33', () => {
    const ch = getChapterFromProgress(0.33);
    assert.equal(ch.name, 'dolly_zoom');
    assert.equal(ch.index, 2);
  });

  it('identifies chapter 4 (The Teardown) at progress 0.45 and 0.70', () => {
    const ch1 = getChapterFromProgress(0.45);
    assert.equal(ch1.name, 'teardown');
    assert.equal(ch1.index, 3);

    const ch2 = getChapterFromProgress(0.70);
    assert.equal(ch2.name, 'teardown');
    assert.equal(ch2.index, 3);
  });

  it('identifies chapter 5 (The Macro) at progress 0.85', () => {
    const ch = getChapterFromProgress(0.85);
    assert.equal(ch.name, 'macro');
    assert.equal(ch.index, 4);
  });

  it('identifies chapter 6 (The Finale) at progress 1.00', () => {
    const ch = getChapterFromProgress(1.00);
    assert.equal(ch.name, 'finale');
    assert.equal(ch.index, 5);
  });

  it('safely clamps negative values to reveal', () => {
    assert.equal(getChapterFromProgress(-0.25).name, 'reveal');
  });

  it('safely clamps overshoot values to finale', () => {
    assert.equal(getChapterFromProgress(1.25).name, 'finale');
  });
});

describe('Fritsch-Carlson PCHIP Spline Interpolator', () => {
  const xs = [0.0, 0.2, 0.5, 0.8, 1.0];
  const ys = [1.0, 1.5, 2.8, 3.2, 4.0];
  const slopes = computePchipTangents(xs, ys);

  it('computes finite monotonic tangents', () => {
    assert.equal(slopes.length, xs.length);
    slopes.forEach((m) => {
      assert.ok(Number.isFinite(m));
      assert.ok(m >= 0, 'Slope should be non-negative for increasing data');
    });
  });

  it('passes strictly through control keyframes', () => {
    xs.forEach((x, idx) => {
      const val = evalHermiteSpline(x, xs, ys, slopes);
      assert.ok(Math.abs(val - ys[idx]) < 0.0001, `Failed at x=${x}`);
    });
  });

  it('prevents overshoot between monotonic points', () => {
    for (let x = 0; x <= 1.0; x += 0.05) {
      const val = evalHermiteSpline(x, xs, ys, slopes);
      assert.ok(val >= 1.0, `Overshoot lower bound at x=${x}`);
      assert.ok(val <= 4.0, `Overshoot upper bound at x=${x}`);
    }
  });
});
