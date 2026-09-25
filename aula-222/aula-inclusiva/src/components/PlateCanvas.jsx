import { useEffect, useRef } from 'react';

const S = 400;

// Generador pseudo-aleatorio con semilla: cada lámina se dibuja siempre igual
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function PlateCanvas({ plate }) {
  const ref = useRef(null);

  useEffect(() => {
    if (plate.image) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const rand = rng(plate.seed);

    // 1) Máscara: qué píxeles pertenecen a cada número
    const off = document.createElement('canvas');
    off.width = S;
    off.height = S;
    const o = off.getContext('2d', { willReadFrequently: true });
    const mask = new Uint8Array(S * S);
    plate.segments.forEach((seg, idx) => {
      o.clearRect(0, 0, S, S);
      o.fillStyle = '#000';
      o.font = `900 ${seg.size}px Arial, Helvetica, sans-serif`;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillText(seg.text, seg.x * S, S * 0.53);
      const d = o.getImageData(0, 0, S, S).data;
      for (let i = 0; i < S * S; i++) if (d[i * 4 + 3] > 128 && !mask[i]) mask[i] = idx + 1;
    });

    // 2) Empaquetado de círculos al azar dentro de la lámina
    const R = S / 2 - 2;
    const cx = S / 2;
    const cy = S / 2;
    const circles = [];
    for (let i = 0; i < 9000 && circles.length < 1300; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * (R - 2);
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist;
      let r = Math.min(11, R - dist - 1);
      for (const c of circles) {
        const gap = Math.hypot(x - c.x, y - c.y) - c.r - 1.2;
        if (gap < r) {
          r = gap;
          if (r < 3.2) break;
        }
      }
      if (r >= 3.2) circles.push({ x, y, r });
    }

    // 3) Pintar
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(0, 0, S, S);
    for (const c of circles) {
      const m = mask[(c.y | 0) * S + (c.x | 0)];
      const pal = m ? plate.segments[m - 1].palette : plate.ground;
      ctx.fillStyle = pal[Math.floor(rand() * pal.length)];
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, [plate]);

  if (plate.image) return <img className="plate-canvas" src={plate.image} alt="Lámina de prueba de color" />;
  return <canvas ref={ref} width={S} height={S} className="plate-canvas" role="img" aria-label="Lámina de prueba de color" />;
}
