/**
 * Mathematical utilities for spline interpolation and progress mapping.
 */

export const CHAPTER_RANGES = [
  { name: 'reveal', label: 'The Reveal', start: 0.00, end: 0.12, index: 0, legacyName: 'hero' },
  { name: 'orbit', label: 'The Orbit', start: 0.12, end: 0.30, index: 1, legacyName: 'exterior' },
  { name: 'dolly_zoom', label: 'The Dolly Zoom', start: 0.30, end: 0.36, index: 2, legacyName: 'dolly' },
  { name: 'teardown', label: 'The Teardown', start: 0.36, end: 0.75, index: 3, legacyName: 'explode' },
  { name: 'macro', label: 'The Macro', start: 0.75, end: 0.90, index: 4, legacyName: 'details' },
  { name: 'finale', label: 'The Finale', start: 0.90, end: 1.00, index: 5, legacyName: 'configurator' }
];

/**
 * Maps normalized scroll progress [0, 1] to the active chapter descriptor.
 * @param {number} p Normalized progress
 * @returns {{ name: string, start: number, end: number, index: number }}
 */
export function getChapterFromProgress(p) {
  const clamped = Math.max(0, Math.min(1, p));
  for (let i = 0; i < CHAPTER_RANGES.length; i++) {
    const r = CHAPTER_RANGES[i];
    if (clamped >= r.start && (clamped < r.end || (i === CHAPTER_RANGES.length - 1 && clamped <= r.end))) {
      return r;
    }
  }
  return CHAPTER_RANGES[CHAPTER_RANGES.length - 1];
}

/**
 * Fritsch-Carlson PCHIP Tangent Calculation.
 * Preserves monotonicity and prevents overshoot.
 * @param {number[]} xs Monotonically increasing X coordinates
 * @param {number[]} ys Y coordinates
 * @returns {number[]} Slopes m at each knot point
 */
export function computePchipTangents(xs, ys) {
  const n = xs.length;
  const m = new Array(n).fill(0);
  if (n <= 1) return m;
  if (n === 2) {
    const slope = (ys[1] - ys[0]) / Math.max(xs[1] - xs[0], 0.0001);
    m[0] = slope;
    m[1] = slope;
    return m;
  }

  const deltas = new Array(n - 1);
  for (let k = 0; k < n - 1; k++) {
    const dx = Math.max(xs[k + 1] - xs[k], 0.0001);
    deltas[k] = (ys[k + 1] - ys[k]) / dx;
  }

  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];

  for (let k = 1; k < n - 1; k++) {
    const d0 = deltas[k - 1];
    const d1 = deltas[k];
    if (d0 * d1 <= 0) {
      m[k] = 0;
    } else {
      const h0 = xs[k] - xs[k - 1];
      const h1 = xs[k + 1] - xs[k];
      const w0 = 2 * h1 + h0;
      const w1 = h1 + 2 * h0;
      m[k] = (w0 + w1) / ((w0 / d0) + (w1 / d1));
    }
  }

  for (let k = 0; k < n - 1; k++) {
    const d = deltas[k];
    if (Math.abs(d) < 1e-7) {
      m[k] = 0;
      m[k + 1] = 0;
    } else {
      const a = m[k] / d;
      const b = m[k + 1] / d;
      if (a < 0) m[k] = 0;
      if (b < 0) m[k + 1] = 0;
      const normSq = a * a + b * b;
      if (normSq > 9) {
        const tau = 3 / Math.sqrt(normSq);
        m[k] = tau * a * d;
        m[k + 1] = tau * b * d;
      }
    }
  }

  return m;
}

/**
 * Evaluates Cubic Hermite basis functions at progress x.
 */
export function evalHermiteSpline(x, xs, ys, ms) {
  let i = 0;
  while (i < xs.length - 1 && xs[i + 1] < x) {
    i++;
  }
  const x0 = xs[i];
  const x1 = xs[Math.min(i + 1, xs.length - 1)];
  const h = Math.max(x1 - x0, 0.0001);
  const t = Math.max(0, Math.min(1, (x - x0) / h));

  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  const idx1 = Math.min(i + 1, xs.length - 1);
  return h00 * ys[i] + h10 * h * ms[i] + h01 * ys[idx1] + h11 * h * ms[idx1];
}

/**
 * Calculates exploded 3D position given rest transform, direction, distance, and factor.
 */
export function calculateExplodedPos(rest, direction, distance, factor, jitter = [0, 0, 0]) {
  return [
    rest[0] + direction[0] * distance * factor + (jitter[0] || 0),
    rest[1] + direction[1] * distance * factor + (jitter[1] || 0),
    rest[2] + direction[2] * distance * factor + (jitter[2] || 0)
  ];
}
