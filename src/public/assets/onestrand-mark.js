/* ONESTRAND · das lebendige Möbius-Zeichen (2D Canvas auf Basis von strand-core.js).
   Zwei Stränge (Silber = Mensch, Blau = Maschine) schliessen sich beim Laden zur Schleife,
   danach wandert die halbe Drehung ruhig und endlos über das Band. */
import { smooth, ease, ribbon, ribbonTone, TAU, SHAPE, MARK } from './strand-core.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const WANDER = 0.16;
const setOff = (held) => WANDER * (held < 1.5 ? (held * held) / 3 : held - 0.75);
const JOIN = 2.6;

function startOnestrandMarks() {
  const marks = Array.from(document.querySelectorAll('[data-mark]'))
    .map((box) => {
      const canvas = box.querySelector('canvas');
      const ctx = canvas && canvas.getContext && canvas.getContext('2d');
      return ctx ? { box, canvas, ctx, seen: true } : null;
    })
    .filter(Boolean);

  if (!marks.length) return;

  const shape = Object.assign({}, SHAPE, { band: MARK.band, tube: 0, glyph: 0 });
  const st = { m: 1, k: 0, roll: 0, turn: 0 };

  const draw = ({ canvas, ctx }) => {
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, w / 110);
    for (const q of ribbon(st, w / h, { shape, pad: MARK.pad, pieces: 56 })) {
      const c = ribbonTone(q.share, q.lit);
      ctx.fillStyle = ctx.strokeStyle =
        'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx[i ? 'lineTo' : 'moveTo']((q.x[i] * 0.5 + 0.5) * w, (0.5 - q.y[i] * 0.5) * h);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };

  const frame = (t) => {
    st.k = smooth(0, 1, t / JOIN);
    st.roll = (-Math.PI / 2) * (1 - ease(st.k));
    st.turn = setOff(Math.max(0, t - JOIN)) % TAU;
    marks.forEach((m) => {
      if (m.seen) draw(m);
    });
  };

  const t0 = performance.now();
  try {
    frame(0);
  } catch {
    return;
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        const m = marks.find((x) => x.box === e.target);
        if (m) m.seen = e.isIntersecting;
      });
    });
    marks.forEach((m) => io.observe(m.box));
  }

  const syncLive = () => marks.forEach((m) => m.box.classList.toggle('is-live', !reduce.matches));
  let raf = 0;
  let last = 0;

  const tick = (now) => {
    raf = 0;
    if (document.hidden || reduce.matches) {
      syncLive();
      return;
    }
    if (now - last > 30) {
      last = now;
      frame((now - t0) / 1000);
    }
    raf = requestAnimationFrame(tick);
  };

  const kick = () => {
    syncLive();
    if (!raf && !document.hidden && !reduce.matches) {
      raf = requestAnimationFrame(tick);
    }
  };

  document.addEventListener('visibilitychange', kick);
  if (reduce.addEventListener) reduce.addEventListener('change', kick);
  kick();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startOnestrandMarks);
} else {
  startOnestrandMarks();
}
