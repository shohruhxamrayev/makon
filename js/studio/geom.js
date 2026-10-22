// Makon Studio — 2D geometry for the plan (metres)
export const vkey = p => Math.round(p[0] * 1000) + "," + Math.round(p[1] * 1000);
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const wlen = w => dist(w.a, w.b);
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// closest point on segment ab to p → { t, d, pt }
export function project(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  const pt = [a[0] + dx * t, a[1] + dy * t];
  return { t, d: dist(p, pt), pt };
}
export const segDist = (p, a, b) => project(p, a, b).d;

function ccw(a, b, c) { return (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0]); }
export function segsIntersect(a, b, c, d) {
  const d1 = ccw(c, d, a), d2 = ccw(c, d, b), d3 = ccw(a, b, c), d4 = ccw(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
export function segSegDist(a, b, c, d) {
  if (segsIntersect(a, b, c, d)) return 0;
  return Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b));
}

// rotated rectangle corners of a furniture item
export function corners(it, pad = 0) {
  const r = (it.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const hw = it.w / 2 + pad, hd = it.d / 2 + pad;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => [it.x + x * c - y * s, it.y + x * s + y * c]);
}

export function polyContains(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
export function polyArea(poly) {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(s / 2);
}
export function polyCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    a += f; cx += (poly[j][0] + poly[i][0]) * f; cy += (poly[j][1] + poly[i][1]) * f;
  }
  if (Math.abs(a) < 1e-9) { const n = poly.length; return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]; }
  return [cx / (3 * a), cy / (3 * a)];
}

// convex polygon overlap (separating axis theorem)
export function satOverlap(A, B, eps = 0.004) {
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const p1 = P[i], p2 = P[(i + 1) % P.length];
      const nx = p2[1] - p1[1], ny = p1[0] - p2[0], L = Math.hypot(nx, ny) || 1;
      let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      for (const q of A) { const v = (q[0] * nx + q[1] * ny) / L; minA = Math.min(minA, v); maxA = Math.max(maxA, v); }
      for (const q of B) { const v = (q[0] * nx + q[1] * ny) / L; minB = Math.min(minB, v); maxB = Math.max(maxB, v); }
      if (maxA <= minB + eps || maxB <= minA + eps) return false;
    }
  }
  return true;
}
export function polyDist(A, B) {
  if (satOverlap(A, B, 0)) return 0;
  let m = Infinity;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++)
    m = Math.min(m, segSegDist(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length]));
  return m;
}
export function polySegDist(P, a, b) {
  if (polyContains(a, P) || polyContains(b, P)) return 0;
  let m = Infinity;
  for (let i = 0; i < P.length; i++) m = Math.min(m, segSegDist(P[i], P[(i + 1) % P.length], a, b));
  return m;
}

// closed loops formed by walls (each vertex with exactly two walls)
export function loops(walls) {
  const adj = new Map(), pts = new Map();
  walls.forEach(w => {
    const ka = vkey(w.a), kb = vkey(w.b);
    if (ka === kb) return;
    pts.set(ka, w.a); pts.set(kb, w.b);
    if (!adj.has(ka)) adj.set(ka, []); if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push(kb); adj.get(kb).push(ka);
  });
  const seen = new Set(), out = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    // collect component
    const comp = [], stack = [start]; seen.add(start);
    while (stack.length) { const k = stack.pop(); comp.push(k); adj.get(k).forEach(n => { if (!seen.has(n)) { seen.add(n); stack.push(n); } }); }
    if (comp.length < 3 || !comp.every(k => adj.get(k).length === 2)) continue;
    const poly = [pts.get(start)]; let prev = start, curk = adj.get(start)[0];
    let guard = 0;
    while (curk !== start && guard++ < 10000) { poly.push(pts.get(curk)); const nx = adj.get(curk).find(n => n !== prev); prev = curk; curk = nx; }
    if (poly.length >= 3) out.push(poly);
  }
  return out;
}

// axis-aligned bounds of everything in the plan
export function bounds(plan) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); };
  plan.walls.forEach(w => { add(w.a); add(w.b); });
  plan.items.forEach(it => corners(it).forEach(add));
  if (!isFinite(x0)) return null;
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
