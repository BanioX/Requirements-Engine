/* ONESTRAND · the geometry of the mark.

   One human double helix (silver) and one machine double helix (blue) stand side by side: HUMAN | MACHINE.
   They bend towards each other and close into a loop, and while they close they unwind and widen: of all their
   turns one half remains. A ladder closed with half a turn is a Möbius band. It has one side, and its two rails
   are in truth one edge, one strand that runs around twice. HUMAN × MACHINE: one strand, one surface.

   This file is pure maths, no DOM: the live WebGL stage (strand-gl.js) and the generator of the still
   SVG marks (tools/build-assets.mjs) both read it, so the logo and the animation can never drift apart.

   State of the mark:
     m  0..1  division: 0 = the human stands alone in the middle, 1 = human left, machine right
     k  0..1  fusion:   0 = two straight helices, 1 = the closed Möbius band
   Coordinates: x to the right, y up, z towards the viewer. The loop lies in the xy plane; the stage tilts it. */

export const TAU = Math.PI * 2;
export const TILT = 1.05;       // how far the closed loop leans back, in radians: seen from above at an angle

export const SHAPE = {
  R: 1,            // radius of the loop
  r: 0.18,         // radius of a straight helix
  turns: 4,        // whole turns of a straight helix; they unwind while the loop closes
  band: 0.33,      // half the width of the Möbius band
  spin: 0.3,       // how the band is turned about its own centreline when it rests, in radians (see railAngle)
  gap: 0.6,        // distance of each straight strand from the middle
  rungs: 21,       // base pairs per half
  tube: 0.021,     // radius of a rail
  rung: 0.008,     // radius of a rung
  glyph: 0.066     // height of a digit beside the machine's rails
};

/* The small mark (header, tab icon): the same band, a little wider so it holds at a few pixels. */
export const MARK = { band: 0.4, pad: 1.05 };

export function clamp(x, a = 0, b = 1) { return x < a ? a : x > b ? b : x; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smooth(a, b, x) { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
export function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

/* How far a rail stands from the centreline: the radius of the helix, growing into half the width of the band. */
export function radius(st, shape) { return lerp(shape.r, shape.band, ease(clamp(st.k))); }

/* The centreline of one half and its frame. half 0 = human (left), 1 = machine (right); s runs 0..1 from the
   near seam (bottom of the loop) to the far seam (top). The half is always a circular arc: a straight line
   for k = 0, a half circle for k = 1. out = [cx, cy, cz, nx, ny, nz, tx, ty, tz]; the binormal is always +z. */
export function centre(half, s, st, shape, out) {
  const R = shape.R, k = st.k, m = st.m;
  const X = m * lerp(shape.gap, R, k);
  const a = (s - 0.5) * Math.PI * R, kap = k / R;
  let x, y, tx, ty, nx, ny;
  if (kap < 1e-4) { x = -X; y = a; tx = 0; ty = 1; nx = -1; ny = 0; }
  else {
    const c = Math.cos(kap * a), sn = Math.sin(kap * a);
    x = -X + (1 - c) / kap; y = sn / kap; tx = sn; ty = c; nx = -c; ny = sn;
  }
  if (half === 1) { x = -x; tx = -tx; nx = -nx; }
  out[0] = x; out[1] = y; out[2] = 0; out[3] = nx; out[4] = ny; out[5] = 0; out[6] = tx; out[7] = ty; out[8] = 0;
  return out;
}

/* The angle of rail `which` (0 or 1) around the centreline: 0 lies in the plane of the loop, a quarter turn
   stands upright on it. A straight helix makes `turns` whole turns and a quarter; in the closed band only the
   quarter is left on each half, half a turn in all. At the near seam both halves agree; at the far seam they
   differ by half a turn: rail 0 of one half meets rail 1 of the other. That is the Möbius.
   While the strands are straight the machine lies exactly on the human at m = 0, so it can leave it like a
   dividing cell. In the closed band, with spin 0 and turn 0, the viewer looks along the band exactly in the
   near seam: there its two rails cross, the × of HUMAN × MACHINE. `st.cross` is the lean of the stage.
   `shape.spin` and `st.turn` turn the band about its own centreline, so the half turn wanders around the
   loop: spin is where it rests (in the still marks too), turn is how far it has wandered since. */
export function railAngle(half, which, s, st, shape) {
  const e = ease(clamp(st.k)), omega = Math.PI * (0.5 + shape.turns * (1 - e));
  const sway = st.sway || 0, base = Math.PI / 2 + ((st.turn || 0) + (shape.spin || 0) - (st.cross || 0)) * e;
  const phi = half === 0 ? base + sway : base + sway * (2 * e - 1);
  return (half === 0 ? -1 : 1) * omega * s + phi + which * Math.PI;
}

/* A point on a rail. out = [x, y, z]. `rho` is the distance from the centreline (see radius; it breathes). */
const _c = new Float64Array(9);
export function railPoint(half, which, s, st, shape, rho, out) {
  centre(half, s, st, shape, _c);
  const al = railAngle(half, which, s, st, shape), ca = rho * Math.cos(al), sa = rho * Math.sin(al);
  out[0] = _c[0] + ca * _c[3]; out[1] = _c[1] + ca * _c[4]; out[2] = sa;
  return out;
}

/* Where a point of the mark sits on the one strand, in laps: 0..2. The strand starts at the near seam, runs up
   the machine half and down the human half (lap one), swaps rails in the far seam of the Möbius and runs
   around again (lap two). Used for the light that travels the strand and for the still marks. */
export function strandCoord(half, which, s) {
  return half === 1 ? which + s * 0.5 : (1 - which) + 1 - s * 0.5;
}

/* The inverse: lap position (0..2) -> [half, which, s]. */
export function strandAt(sigma) {
  const q = ((sigma % 2) + 2) % 2, lap = q < 1 ? 0 : 1, f = q - lap;
  return f < 0.5 ? [1, lap, f * 2] : [0, 1 - lap, (1 - f) * 2];
}

/* How much of a point is machine: 0 = silver, 1 = blue. Straight strands carry their own colour (the machine
   cools from silver to blue while it leaves the human); in the loop the two colours flow into one another
   around both seams. `width` is the half width of that blend in s. */
export function machineShare(half, s, st, width = 0.11) {
  const digit = st.m * st.m, k = st.k;
  const edge = Math.min(s, 1 - s);                       // distance to the nearer seam
  const blend = 0.5 * (1 - smooth(0, width, edge)) * smooth(0.6, 1, k);
  return half === 0 ? blend : digit * (1 - blend);
}

/* How close a point is to a seam, 0..1, once the loop is closed: the light of the fusion. */
export function seamGlow(s, st, width = 0.045) {
  const edge = Math.min(s, 1 - s);
  return Math.exp(-(edge * edge) / (width * width)) * smooth(0.9, 1, st.k);
}

/* The stage: how the mark is turned and how far the camera stands, as a function of the state. The camera
   stands just far enough to hold the whole mark, whatever shape it has at the moment: standing or lying
   strands (`st.roll` lays them across the stage), the loop that leans back with its near side looming larger
   than its far side, and everything between. `lift` moves the picture so the mark sits in the middle. */
const _f = new Float64Array(9);
export function pose(st, aspect, opts = {}) {
  const shape = opts.shape || SHAPE, k = ease(clamp(st.k));
  const tilt = lerp(0, opts.tilt === undefined ? TILT : opts.tilt, k);      // radians, top of the loop leans back
  const fov = opts.fov || 0.42, pad = opts.pad === undefined ? 1.12 : opts.pad, th = Math.tan(fov / 2);
  const rot = rotation(tilt, 0, st.roll || 0), both = st.m > 0.004;
  const margin = radius(st, shape) + shape.tube + shape.glyph * 1.5 * smooth(0, 0.35, st.m);   // rails, and the digits beside them as the machine appears
  const N = 16, pts = [];
  for (let half = 0; half < (both ? 2 : 1); half++) for (let i = 0; i <= N; i++) {
    centre(half, i / N, st, shape, _f);
    pts.push(rot[0] * _f[0] + rot[3] * _f[1], rot[1] * _f[0] + rot[4] * _f[1], rot[2] * _f[0] + rot[5] * _f[1]);
  }
  let dist = 8, lift = 0;
  for (let round = 0; round < 5; round++) {
    let wide = 0, top = -1e9, bottom = 1e9;
    for (let i = 0; i < pts.length; i += 3) {
      const near = dist / Math.max(0.5, dist - pts[i + 2]);                 // what is nearer looks larger
      wide = Math.max(wide, (Math.abs(pts[i]) + margin) * near);
      top = Math.max(top, (pts[i + 1] + lift + margin) * near); bottom = Math.min(bottom, (pts[i + 1] + lift - margin) * near);
    }
    lift -= (top + bottom) / 2;
    dist = Math.max((top - bottom) / 2 * pad / th, wide * pad / (th * aspect));
  }
  return { tilt, fov, dist, lift };
}

/* The mark as a solid ribbon, for small sizes where rails, rungs and glass would be lost: the surface between
   the two rails, cut into short pieces. Each piece knows its four corners on the picture (x and y in -1..1,
   y up), its depth, how much of it is machine and how the light falls on it. The pieces come sorted from far
   to near, so painting them in this order gives the right picture, for the two twisted strands as well as
   for the closed band. The header's living mark and the still SVG marks are both drawn from this. */
const _a = new Float64Array(3), _b = new Float64Array(3), LAMP = [-0.38, 0.62, 0.68];
export function ribbon(st, aspect, opts = {}) {
  const shape = opts.shape || SHAPE, n = opts.pieces || 64, tilt = opts.tilt === undefined ? TILT : opts.tilt;
  st.cross = tilt;
  const view = pose(st, aspect, { shape, tilt, pad: opts.pad, fov: opts.fov });
  const rot = rotation(view.tilt, 0, st.roll || 0), mvp = viewProjection(rot, view.dist, view.fov, aspect, view.lift);
  const rho = radius(st, shape), out = [];
  const seen = (p) => [rot[0] * p[0] + rot[3] * p[1] + rot[6] * p[2], rot[1] * p[0] + rot[4] * p[1] + rot[7] * p[2], rot[2] * p[0] + rot[5] * p[1] + rot[8] * p[2]];
  for (let half = 0; half < (st.m > 0.004 ? 2 : 1); half++) {
    let a0 = null, b0 = null, va = null, vb = null;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      railPoint(half, 0, s, st, shape, rho, _a); railPoint(half, 1, s, st, shape, rho, _b);
      const a1 = project(mvp, rot, _a), b1 = project(mvp, rot, _b), wa = seen(_a), wb = seen(_b);
      if (i > 0) {
        const u = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]], v = [wa[0] - va[0], wa[1] - va[1], wa[2] - va[2]];
        const nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
        const lit = Math.abs(nx * LAMP[0] + ny * LAMP[1] + nz * LAMP[2]) / (Math.hypot(nx, ny, nz) || 1);
        out.push({ x: [a0[0], a1[0], b1[0], b0[0]], y: [a0[1], a1[1], b1[1], b0[1]], depth: (a0[2] + a1[2] + b0[2] + b1[2]) / 4,
          share: machineShare(half, (i - 0.5) / n, st), lit });
      }
      a0 = a1; b0 = b1; va = wa; vb = wb;
    }
  }
  return out.sort((p, q) => p.depth - q.depth);
}
/* The colour of a piece of that ribbon: silver or blue, lighter where the light falls on it. [r, g, b], 0..1. */
export function ribbonTone(share, lit) {
  const light = 0.2 + 0.8 * Math.pow(lit, 0.8), t = Math.pow(clamp(share), 1.5);
  const silver = [lerp(0.36, 0.96, light), lerp(0.38, 0.97, light), lerp(0.42, 0.98, light)];
  const blue = [lerp(0.02, 0.42, light), lerp(0.20, 0.70, light), lerp(0.62, 1.0, light)];
  return [lerp(silver[0], blue[0], t), lerp(silver[1], blue[1], t), lerp(silver[2], blue[2], t)];
}

/* Column-major 4x4 matrices, just enough of them. */
export function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}
export function rotation(tilt, yaw, roll = 0) {
  // roll about z, then tilt about x (top leans back), then yaw about y
  const cx = Math.cos(-tilt), sx = Math.sin(-tilt), cy = Math.cos(yaw), sy = Math.sin(yaw), cz = Math.cos(roll), sz = Math.sin(roll);
  const rx = [1, 0, 0, 0, cx, sx, 0, -sx, cx], ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy], rz = [cz, sz, 0, -sz, cz, 0, 0, 0, 1];
  return mul3(ry, mul3(rx, rz));
}
function mul3(a, b) {
  const o = new Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
  return o;
}
/* View-projection for a model rotation `rot` (3x3) and a camera at distance `dist` on +z. */
export function viewProjection(rot, dist, fov, aspect, shiftY = 0) {
  const p = perspective(fov, aspect, Math.max(0.1, dist - 4), dist + 4);
  const v = [rot[0], rot[1], rot[2], 0, rot[3], rot[4], rot[5], 0, rot[6], rot[7], rot[8], 0, 0, shiftY, -dist, 1];
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = p[r] * v[c * 4] + p[4 + r] * v[c * 4 + 1] + p[8 + r] * v[c * 4 + 2] + p[12 + r] * v[c * 4 + 3];
  }
  return o;
}
/* Project a point: returns [x, y] in -1..1 and the view depth (larger = nearer). */
export function project(mvp, rot, p) {
  const w = mvp[3] * p[0] + mvp[7] * p[1] + mvp[11] * p[2] + mvp[15];
  return [
    (mvp[0] * p[0] + mvp[4] * p[1] + mvp[8] * p[2] + mvp[12]) / w,
    (mvp[1] * p[0] + mvp[5] * p[1] + mvp[9] * p[2] + mvp[13]) / w,
    rot[2] * p[0] + rot[5] * p[1] + rot[8] * p[2]
  ];
}
