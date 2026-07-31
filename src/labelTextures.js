/**
 * Procedural label artwork for the Resin Culture rosin jar.
 *
 * Every printed surface on the reference jar is drawn here in canvas 2D — no
 * external art, no photo projection. The reference wraps are photographed on a
 * curved, unevenly lit surface, so projecting them would bake that lighting into
 * the albedo. Drawing them instead gives clean, correctly-unwrapped art.
 *
 * Each surface returns three independent fields:
 *   albedo    — colour only
 *   roughness — from the ink/foil masks, never from the albedo pixels
 *   height    — paper fibre tooth + raised screen-print relief
 * The normal map is derived from height by Sobel, so relief survives a relight.
 *
 * All randomness runs through one seeded mulberry32 PRNG: a rebuild is identical.
 */

// ---------------------------------------------------------------- palette
export const PAL = {
  brick: ['#BE9260', '#B08150', '#C79E6C', '#9E7044', '#AC7C4C'],
  mortar: '#6B4E33',
  brickShade: 'rgba(60,38,20,0.30)',

  inkBlack: '#14110D',
  graffYellow: '#F5DC3C',
  graffOrange: '#F0842E',
  graffGreen: '#1E6B37',
  graffGreenLite: '#3E9455',
  sprayPink: '#E86FA8',
  sprayMagenta: '#E8399B',
  gold: '#C8A24A',
  goldLite: '#E7CE86',

  sky: '#3FA9DC',
  skyHi: '#AEDDF3',
  cloud: '#F2F6F8',
  bldgRed: '#A9502F',
  bldgTeal: '#6E8E96',
  bldgPurple: '#6D5B86',
  bldgPink: '#C98BA0',
  bldgGrey: '#97A0A8',
  train: '#C9CDD2',
  trainDark: '#8E969E',
  windowLit: '#EAF3FA',
  windowDim: '#8FB6CE',
  rail: '#5A5F66',

  sunYellow: '#F0C13C',
  sunDeep: '#E3A11F',
  sunOrange: '#E2703A',
  teal: '#3FC8C8',
  irisBlue: '#7FD4E8',
};

// ---------------------------------------------------------------- utilities
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const FONT_HEAVY = "'Arial Black', Impact, 'Haettenschweiler', sans-serif";
const FONT_COND = "Impact, 'Arial Narrow', 'Arial Black', sans-serif";

/** Sobel height -> tangent-space normal map. Independent of the albedo. */
export function heightToNormal(heightCanvas, strength = 2.0) {
  const w = heightCanvas.width, h = heightCanvas.height;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const at = (x, y) => {
    const xi = x < 0 ? 0 : x >= w ? w - 1 : x;
    const yi = y < 0 ? 0 : y >= h ? h - 1 : y;
    return src[(yi * w + xi) * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1))
               - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1))
               - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength, ny = -dy * strength, nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Uncoated-stock fibre tooth: the micro frequency band on every printed surface. */
function paperTooth(ctx, w, h, rnd, amount = 10) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- brick wall
/**
 * Running-bond brick print. repetitionSystem: brick-courses.
 * Printed, not moulded — so it goes into albedo and only very lightly into height.
 */
function drawBricks(ctx, x0, y0, w, h, courses, rnd, opts = {}) {
  const bh = h / courses;
  const bw = bh * (opts.ratio ?? 2.35);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = PAL.mortar;
  ctx.fillRect(x0, y0, w, h);
  for (let r = 0; r < courses + 1; r++) {
    const y = y0 + r * bh;
    const off = (r % 2) * bw * 0.5;
    for (let x = x0 - bw; x < x0 + w + bw; x += bw) {
      const px = x + off;
      const jw = bw * (1 - 0.045 * rnd());
      const jh = bh * (1 - 0.10 * rnd());
      ctx.fillStyle = PAL.brick[(Math.floor(rnd() * PAL.brick.length))];
      ctx.fillRect(px + bw * 0.03, y + bh * 0.07, jw - bw * 0.06, jh - bh * 0.10);
      // per-brick tonal jitter, always on: a wall of identical bricks reads as tile
      ctx.fillStyle = rnd() < 0.5
        ? `rgba(86,54,26,${0.04 + rnd() * 0.16})`
        : `rgba(255,232,200,${0.02 + rnd() * 0.10})`;
      ctx.fillRect(px + bw * 0.03, y + bh * 0.07, jw - bw * 0.06, jh - bh * 0.10);
      // top-edge catch on each brick so the mortar reads as a recess
      ctx.fillStyle = 'rgba(255,236,206,0.14)';
      ctx.fillRect(px + bw * 0.03, y + bh * 0.07, jw - bw * 0.06, bh * 0.08);
    }
  }
  ctx.restore();
}

/** Soft airbrush halo — the spray bloom that sits behind the letterforms. */
function sprayBlob(ctx, cx, cy, rx, ry, color, alpha, rnd) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, color);
  g.addColorStop(0.55, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // overspray freckles
  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = color;
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, d = rx * (0.75 + rnd() * 0.55);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * (ry / rx), rnd() * 2.6 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Chunky graffiti caps: per-letter skew and rotation jitter, a dark green offset
 * shadow layer, a heavy black key line, then a vertical yellow->orange gradient
 * fill with a white hot-spot. featureReviewTarget: graffiti-lettering-identity.
 * Returns the ink mask path so the roughness/height passes can reuse it.
 */
function graffitiWord(ctx, text, cx, cy, size, rnd, opts = {}) {
  const letters = text.split('');
  const spacing = opts.spacing ?? 0.70;      // tight enough that the caps interlock
  ctx.save();
  ctx.font = `${size}px ${FONT_HEAVY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const widths = letters.map((ch) => ctx.measureText(ch).width * spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  const placed = [];
  for (let i = 0; i < letters.length; i++) {
    const w = widths[i];
    placed.push({
      ch: letters[i],
      x: x + w / 2,
      y: cy + (rnd() - 0.5) * size * 0.20,
      rot: (rnd() - 0.5) * 0.30,
      scale: 1 + (rnd() - 0.5) * 0.22,
      skew: -0.22 + (rnd() - 0.5) * 0.34,     // consistent forward lean, jittered
    });
    x += w;
  }

  /**
   * One letter stamp. `styleFor` is a callback so a gradient can be built in the
   * letter's LOCAL space — building it once in canvas space and filling after a
   * translate makes every letter sample the clamped end colour, which is why the
   * first version came out flat cream instead of yellow-to-orange.
   */
  const stamp = (dx, dy, styleFor, strokeW) => {
    for (const p of placed) {
      ctx.save();
      ctx.translate(p.x + dx, p.y + dy);
      ctx.rotate(p.rot);
      ctx.transform(1, 0, p.skew, 1, 0, 0);
      ctx.scale(p.scale, p.scale * (opts.stretch ?? 1.30));
      ctx.font = `${size}px ${FONT_HEAVY}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const style = styleFor(ctx, size);
      if (strokeW) {
        ctx.lineJoin = 'miter'; ctx.miterLimit = 3;
        ctx.lineWidth = strokeW / p.scale; ctx.strokeStyle = style;
        ctx.strokeText(p.ch, 0, 0);
      } else {
        ctx.fillStyle = style;
        ctx.fillText(p.ch, 0, 0);
      }
      ctx.restore();
    }
  };

  const flat = (c) => () => c;
  const off = size * 0.11;
  stamp(off, off * 1.2, flat(PAL.graffGreen), size * 0.40);   // green offset shadow
  stamp(off, off * 1.2, flat(PAL.graffGreen), 0);
  stamp(0, 0, flat(PAL.inkBlack), size * 0.34);               // heavy black key line
  stamp(0, 0, (c, sz) => {                                    // yellow -> orange fill
    const g = c.createLinearGradient(0, -sz * 0.60, 0, sz * 0.60);
    g.addColorStop(0.00, '#FFF29A');
    g.addColorStop(0.22, PAL.graffYellow);
    g.addColorStop(0.60, '#F2A32C');
    g.addColorStop(1.00, '#E2661C');
    return g;
  }, 0);
  ctx.restore();
  return placed;
}

/** Letter-spaced small caps in hot gold foil. */
function foilCaps(ctx, text, cx, y, size, tracking) {
  ctx.save();
  ctx.font = `700 ${size}px ${FONT_COND}`;
  ctx.textBaseline = 'middle';
  const chars = text.split('');
  const w = chars.reduce((a, ch) => a + ctx.measureText(ch).width + tracking, 0);
  let x = cx - w / 2;
  const g = ctx.createLinearGradient(0, y - size * 0.6, 0, y + size * 0.6);
  g.addColorStop(0, PAL.goldLite);
  g.addColorStop(0.45, PAL.gold);
  g.addColorStop(0.55, '#9C7A2E');
  g.addColorStop(1, PAL.goldLite);
  for (const ch of chars) {
    ctx.fillStyle = 'rgba(30,20,6,0.55)';
    ctx.fillText(ch, x + size * 0.05, y + size * 0.06);
    ctx.fillStyle = g;
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking;
  }
  ctx.restore();
  return { x0: cx - w / 2, x1: cx + w / 2 };
}

// ============================================================ BODY LABEL WRAP
/**
 * Brick wall + SOUR DIESEL BX2 + the gold foil product line.
 * Aspect is the true unwrapped aspect (circumference / band height = 7.96).
 */
export function buildBodyLabel(W = 4096) {
  const H = Math.round(W / 7.96);           // 514 at 4096
  const rnd = mulberry32(0x5011D1E5);

  const albedo = makeCanvas(W, H);
  const a = albedo.getContext('2d');
  const rough = makeCanvas(W >> 1, H >> 1);
  const r = rough.getContext('2d');
  const height = makeCanvas(W >> 1, H >> 1);
  const hh = height.getContext('2d');

  // --- albedo -------------------------------------------------------------
  drawBricks(a, 0, 0, W, H, 9, rnd, { ratio: 2.15 });
  // grime gradient so the wall is not uniformly lit
  const grime = a.createLinearGradient(0, 0, 0, H);
  grime.addColorStop(0, 'rgba(70,45,22,0.16)');
  grime.addColorStop(0.45, 'rgba(70,45,22,0.00)');
  grime.addColorStop(1, 'rgba(50,32,16,0.26)');
  a.fillStyle = grime; a.fillRect(0, 0, W, H);

  // spray haloes behind the type (three sites round the wrap so the back reads too)
  const centres = [W * 0.5, W * 0.5 + W / 3, W * 0.5 - W / 3];
  for (let i = 0; i < centres.length; i++) {
    const cx = ((centres[i] % W) + W) % W;
    sprayBlob(a, cx, H * 0.44, W * 0.130, H * 0.40, PAL.sprayPink, 0.85, rnd);
    sprayBlob(a, cx + W * 0.060, H * 0.64, W * 0.075, H * 0.30, PAL.sprayMagenta, 0.62, rnd);
    sprayBlob(a, cx - W * 0.085, H * 0.32, W * 0.058, H * 0.24, PAL.sprayMagenta, 0.48, rnd);
  }

  // the wordmark, repeated at 3 phases so the whole 360 deg carries artwork
  const inkBoxes = [];
  for (let i = 0; i < 3; i++) {
    const cx = ((W * 0.5 + (i * W) / 3) % W + W) % W;
    const draw = (ox) => {
      graffitiWord(a, 'SOUR DIESEL', cx + ox, H * 0.40, H * 0.36, mulberry32(0xA11CE + i));
      graffitiWord(a, 'BX2', cx + ox + W * 0.045, H * 0.70, H * 0.30, mulberry32(0xB0B + i));
    };
    draw(0);
    if (cx < W * 0.16) draw(W);          // wrap-around so nothing is clipped at the seam
    if (cx > W * 0.84) draw(-W);
    inkBoxes.push(cx);
  }

  // gold foil product line along the bottom band
  a.save();
  a.fillStyle = 'rgba(20,14,8,0.30)';
  a.fillRect(0, H * 0.855, W, H * 0.105);
  a.restore();
  for (let i = 0; i < 3; i++) {
    const cx = ((W * 0.5 + (i * W) / 3) % W + W) % W;
    a.save(); a.textAlign = 'left';
    foilCaps(a, 'COLD-CURE  •  PREMIUM LIVE ROSIN', cx, H * 0.907, H * 0.088, H * 0.030);
    a.restore();
  }
  paperTooth(a, W, H, rnd, 12);

  // --- roughness (ink/foil masks only, never the albedo) -------------------
  const rw = rough.width, rhh = rough.height;
  r.fillStyle = '#95';                                  // fallback
  r.fillStyle = 'rgb(148,148,148)';                     // paper: 0.58
  r.fillRect(0, 0, rw, rhh);
  r.save(); r.scale(rw / W, rhh / H);
  for (let i = 0; i < 3; i++) {
    const cx = ((W * 0.5 + (i * W) / 3) % W + W) % W;
    const g2 = mulberry32(0xA11CE + i);
    r.globalCompositeOperation = 'source-over';
    // raised ink reads glossier: roughness 0.28
    r.fillStyle = 'rgb(71,71,71)';
    graffitiWordMask(r, 'SOUR DIESEL', cx, H * 0.40, H * 0.36, g2, 'rgb(71,71,71)');
    graffitiWordMask(r, 'BX2', cx + W * 0.045, H * 0.70, H * 0.30, mulberry32(0xB0B + i), 'rgb(71,71,71)');
    r.fillStyle = 'rgb(77,77,77)';                       // foil: 0.30
    r.font = `700 ${H * 0.088}px ${FONT_COND}`;
    r.textBaseline = 'middle'; r.textAlign = 'center';
    r.fillText('COLD-CURE  •  PREMIUM LIVE ROSIN', cx, H * 0.907);
  }
  r.restore();
  paperTooth(r, rw, rhh, mulberry32(0x2222), 26);

  // --- height (fibre tooth + raised ink relief) ---------------------------
  hh.fillStyle = 'rgb(118,118,118)';
  hh.fillRect(0, 0, rw, rhh);
  hh.save(); hh.scale(rw / W, rhh / H);
  for (let i = 0; i < 3; i++) {
    const cx = ((W * 0.5 + (i * W) / 3) % W + W) % W;
    graffitiWordMask(hh, 'SOUR DIESEL', cx, H * 0.40, H * 0.36, mulberry32(0xA11CE + i), 'rgb(190,190,190)');
    graffitiWordMask(hh, 'BX2', cx + W * 0.045, H * 0.70, H * 0.30, mulberry32(0xB0B + i), 'rgb(190,190,190)');
  }
  hh.restore();
  // faint mortar grooves + strong fibre tooth
  paperTooth(hh, rw, rhh, mulberry32(0x3333), 46);

  // --- metalness (only the foil is metal) ---------------------------------
  const metal = makeCanvas(W >> 2, H >> 2);
  const m = metal.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, metal.width, metal.height);
  m.save(); m.scale(metal.width / W, metal.height / H);
  m.fillStyle = 'rgb(217,217,217)';
  m.font = `700 ${H * 0.088}px ${FONT_COND}`;
  m.textBaseline = 'middle'; m.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const cx = ((W * 0.5 + (i * W) / 3) % W + W) % W;
    m.fillText('COLD-CURE  •  PREMIUM LIVE ROSIN', cx, H * 0.907);
  }
  m.restore();

  return { albedo, roughness: rough, height, metalness: metal, normal: heightToNormal(height, 1.6) };
}

/** Same letter layout as graffitiWord but flat-filled — used for the data maps. */
function graffitiWordMask(ctx, text, cx, cy, size, rnd, fill) {
  ctx.save();
  ctx.font = `${size}px ${FONT_HEAVY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const spacing = 0.70;
  const letters = text.split('');
  const widths = letters.map((ch) => ctx.measureText(ch).width * spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  for (let i = 0; i < letters.length; i++) {
    const w = widths[i];
    const px = x + w / 2;
    const py = cy + (rnd() - 0.5) * size * 0.20;
    const rot = (rnd() - 0.5) * 0.30;
    const sc = 1 + (rnd() - 0.5) * 0.22;
    const sk = -0.22 + (rnd() - 0.5) * 0.34;
    ctx.save();
    ctx.translate(px, py); ctx.rotate(rot); ctx.transform(1, 0, sk, 1, 0, 0);
    ctx.scale(sc, sc * 1.30);
    ctx.font = `${size}px ${FONT_HEAVY}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'miter'; ctx.miterLimit = 3; ctx.lineWidth = size * 0.34 / sc;
    ctx.strokeStyle = fill; ctx.strokeText(letters[i], 0, 0);
    ctx.fillStyle = fill; ctx.fillText(letters[i], 0, 0);
    ctx.restore();
    x += w;
  }
  ctx.restore();
}

// ======================================================== CAP SKIRT LABEL WRAP
/** Cyan sky, cloud banks, six outlined buildings, elevated train, brick top courses. */
export function buildSkirtLabel(W = 4096) {
  const H = Math.round(W / 11.1);          // 369 at 4096
  const rnd = mulberry32(0x5C1F7A);
  const albedo = makeCanvas(W, H);
  const a = albedo.getContext('2d');

  // sky
  const sky = a.createLinearGradient(0, 0, 0, H * 0.72);
  sky.addColorStop(0, '#8FD0EC');
  sky.addColorStop(0.30, PAL.sky);
  sky.addColorStop(1, '#2F94C8');
  a.fillStyle = sky; a.fillRect(0, 0, W, H);

  // cloud banks
  for (let i = 0; i < 13; i++) {
    const cx = rnd() * W, cy = H * (0.06 + rnd() * 0.20), s = H * (0.055 + rnd() * 0.085);
    a.fillStyle = PAL.cloud; a.globalAlpha = 0.72;
    a.beginPath();
    for (let k = 0; k < 5; k++) {
      a.arc(cx + (k - 2) * s * 0.58, cy + Math.sin(k) * s * 0.12, s * (0.55 + rnd() * 0.32), 0, Math.PI * 2);
    }
    a.fill(); a.globalAlpha = 1;
  }

  // buildings — repetitionSystem: skyline-window-grid
  const kinds = [
    { c: '#9C4A2C', w: 0.072, h: 0.40, cols: 4, rows: 4 },   // red-brick low-rise
    { c: '#6E8E96', w: 0.042, h: 0.60, cols: 3, rows: 7 },   // teal glass tower
    { c: '#6D5B86', w: 0.050, h: 0.68, cols: 4, rows: 8 },   // purple slab
    { c: '#B87F92', w: 0.078, h: 0.30, cols: 4, rows: 3 },   // pink block
    { c: '#8B959D', w: 0.046, h: 0.50, cols: 3, rows: 6 },   // grey mid-rise
    { c: '#A75A38', w: 0.064, h: 0.36, cols: 4, rows: 4 },
  ];
  const ground = H * 0.80;
  let x = -W * 0.03;
  let ki = 0;
  while (x < W * 1.03) {
    const k = kinds[ki % kinds.length];
    const bw = W * k.w * (0.85 + rnd() * 0.35);
    const bh = H * k.h * (0.85 + rnd() * 0.3);
    const by = ground - bh;
    a.fillStyle = k.c;
    a.fillRect(x, by, bw, bh);
    a.fillStyle = 'rgba(0,0,0,0.16)';                       // shaded right face
    a.fillRect(x + bw * 0.72, by, bw * 0.28, bh);
    a.strokeStyle = PAL.inkBlack; a.lineWidth = Math.max(1.8, H * 0.014);
    a.strokeRect(x, by, bw, bh);
    // window grid
    const mx = bw * 0.14, my = bh * 0.10;
    const cw = (bw - mx * 2) / k.cols, ch = (bh - my * 2) / k.rows;
    for (let c = 0; c < k.cols; c++) {
      for (let rr = 0; rr < k.rows; rr++) {
        a.fillStyle = rnd() < 0.22 ? PAL.windowLit : '#7FA6BF';
        a.fillRect(x + mx + c * cw + cw * 0.16, by + my + rr * ch + ch * 0.16,
                   cw * 0.68, ch * 0.60);
      }
    }
    x += bw * (1.02 + rnd() * 0.22);
    ki++;
  }

  // elevated rail line + train car
  const railY = H * 0.665;
  a.fillStyle = PAL.rail; a.fillRect(0, railY, W, H * 0.030);
  a.fillStyle = 'rgba(20,18,16,0.55)'; a.fillRect(0, railY + H * 0.030, W, H * 0.012);
  for (let px = 0; px < W; px += W * 0.028) {          // support columns
    a.fillStyle = PAL.rail;
    a.fillRect(px, railY + H * 0.03, H * 0.022, H * 0.115);
  }
  for (let t = 0; t < 3; t++) {
    const tx = ((W * 0.14 + (t * W) / 3) % W + W) % W;
    const tw = W * 0.115, th = H * 0.185;
    const ty = railY - th;
    const drawTrain = (ox) => {
      a.fillStyle = PAL.train;
      a.beginPath();
      a.roundRect(tx + ox, ty, tw, th, H * 0.035);
      a.fill();
      a.strokeStyle = PAL.inkBlack; a.lineWidth = Math.max(1.6, H * 0.012); a.stroke();
      a.fillStyle = PAL.trainDark;
      a.fillRect(tx + ox, ty + th * 0.62, tw, th * 0.12);
      for (let wch = 0; wch < 5; wch++) {
        a.fillStyle = PAL.windowLit;
        a.fillRect(tx + ox + tw * (0.08 + wch * 0.175), ty + th * 0.16, tw * 0.125, th * 0.36);
        a.strokeStyle = PAL.inkBlack; a.lineWidth = Math.max(1, H * 0.007);
        a.strokeRect(tx + ox + tw * (0.08 + wch * 0.175), ty + th * 0.16, tw * 0.125, th * 0.36);
      }
    };
    drawTrain(0);
    if (tx < tw) drawTrain(W);
    if (tx > W - tw) drawTrain(-W);
  }

  // top courses of the brick wall, so the scene continues onto the body wrap
  drawBricks(a, 0, H * 0.80, W, H * 0.175, 3, rnd);
  const gr = a.createLinearGradient(0, H * 0.80, 0, H);
  gr.addColorStop(0, 'rgba(60,38,20,0.28)');
  gr.addColorStop(1, 'rgba(60,38,20,0.02)');
  a.fillStyle = gr; a.fillRect(0, H * 0.80, W, H * 0.20);
  // the divider rule: the visual join between cap and jar
  a.fillStyle = 'rgba(24,20,16,0.85)';
  a.fillRect(0, H * 0.975, W, H * 0.025);
  paperTooth(a, W, H, rnd, 11);

  // data maps
  const rw = W >> 1, rhh = H >> 1;
  const rough = makeCanvas(rw, rhh);
  const r = rough.getContext('2d');
  r.fillStyle = 'rgb(148,148,148)'; r.fillRect(0, 0, rw, rhh);
  r.fillStyle = 'rgb(87,87,87)';                    // glazed windows: 0.34
  r.save(); r.scale(rw / W, rhh / H);
  r.fillRect(0, railY - H * 0.2, W, H * 0.02);
  r.restore();
  paperTooth(r, rw, rhh, mulberry32(0x4444), 24);

  const height = makeCanvas(rw, rhh);
  const hc = height.getContext('2d');
  hc.fillStyle = 'rgb(120,120,120)'; hc.fillRect(0, 0, rw, rhh);
  paperTooth(hc, rw, rhh, mulberry32(0x5555), 44);

  return { albedo, roughness: rough, height, normal: heightToNormal(height, 1.4) };
}

// ========================================================== CAP TOP EMBLEM
/** Brick backdrop, magenta tag, sun with two mirrored faces, galaxy eyeball, type. */
export function buildTopLabel(S = 2048) {
  const rnd = mulberry32(0x50E7E);
  const albedo = makeCanvas(S, S);
  const a = albedo.getContext('2d');
  const cx = S / 2, cy = S / 2;

  drawBricks(a, 0, 0, S, S, 11, rnd, { ratio: 2.5 });
  const vig = a.createRadialGradient(cx, cy, S * 0.15, cx, cy, S * 0.55);
  vig.addColorStop(0, 'rgba(255,238,210,0.10)');
  vig.addColorStop(1, 'rgba(50,32,16,0.22)');
  a.fillStyle = vig; a.fillRect(0, 0, S, S);

  // magenta spray tag running off to the right
  a.save();
  a.strokeStyle = PAL.sprayMagenta; a.lineCap = 'round'; a.lineJoin = 'round';
  a.globalAlpha = 0.85;
  a.lineWidth = S * 0.022;
  a.beginPath();
  a.moveTo(S * 0.74, S * 0.30);
  a.bezierCurveTo(S * 0.86, S * 0.34, S * 0.80, S * 0.46, S * 0.88, S * 0.50);
  a.bezierCurveTo(S * 0.78, S * 0.56, S * 0.86, S * 0.63, S * 0.76, S * 0.68);
  a.stroke();
  a.globalAlpha = 0.35; a.lineWidth = S * 0.055; a.stroke();
  a.restore();

  // ---- sun ray fan (repetitionSystem: sun-ray-fan) ----------------------
  const RAYS = 22, rIn = S * 0.285, rOut = S * 0.487;
  a.save();
  a.translate(cx, cy);
  for (let i = 0; i < RAYS; i++) {
    const th = (i / RAYS) * Math.PI * 2;
    const long = i % 2 === 0;
    const len = rOut * (long ? 1.0 : 0.86) * (0.94 + rnd() * 0.12);
    const halfW = (Math.PI / RAYS) * (long ? 1.00 : 0.78) * (0.9 + rnd() * 0.2);
    // Flame tongue: the tip hooks to one side and the flanks bow, which is what
    // makes it read as a drawn sun rather than a starburst.
    const hook = (rnd() * 0.5 + 0.35) * halfW * (i % 3 === 0 ? -1 : 1);
    const P = (ang, r) => [Math.cos(ang) * r, Math.sin(ang) * r];
    const [ax, ay] = P(th - halfW, rIn * 0.95);
    const [bx, by] = P(th + halfW, rIn * 0.95);
    const [tx, ty] = P(th + hook, len);
    const [c1x, c1y] = P(th - halfW * 0.55, rIn + (len - rIn) * 0.55);
    const [c2x, c2y] = P(th + halfW * 0.75, rIn + (len - rIn) * 0.60);
    a.beginPath();
    a.moveTo(ax, ay);
    a.quadraticCurveTo(c1x, c1y, tx, ty);
    a.quadraticCurveTo(c2x, c2y, bx, by);
    a.closePath();
    const rg = a.createLinearGradient(0, 0, Math.cos(th) * len, Math.sin(th) * len);
    rg.addColorStop(0, '#F3C942');
    rg.addColorStop(0.6, PAL.sunDeep);
    rg.addColorStop(1, '#C9820F');
    a.fillStyle = rg; a.fill();
    a.strokeStyle = PAL.inkBlack; a.lineWidth = S * 0.0085;
    a.lineJoin = 'round'; a.stroke();
    // hatch strokes along the tongue
    a.lineWidth = S * 0.0035;
    for (let k = 1; k <= 3; k++) {
      const f = 0.35 + k * 0.16;
      const [hx, hy] = P(th - halfW * (0.5 - k * 0.1), rIn + (len - rIn) * f);
      const [hx2, hy2] = P(th + halfW * (0.15 + k * 0.06), rIn + (len - rIn) * (f + 0.05));
      a.beginPath(); a.moveTo(hx, hy); a.lineTo(hx2, hy2); a.stroke();
    }
  }
  a.restore();

  // ---- sun disc with two mirrored faces ---------------------------------
  a.save(); a.translate(cx, cy);
  const disc = a.createRadialGradient(-rIn * 0.3, -rIn * 0.3, rIn * 0.1, 0, 0, rIn);
  disc.addColorStop(0, '#FBDB74');
  disc.addColorStop(0.45, '#EFC138');
  disc.addColorStop(0.82, PAL.sunDeep);
  disc.addColorStop(1, '#C88A16');
  a.beginPath(); a.arc(0, 0, rIn, 0, Math.PI * 2);
  a.fillStyle = disc; a.fill();
  a.strokeStyle = PAL.inkBlack; a.lineWidth = S * 0.008; a.stroke();

  // face features, mirrored top and bottom about the eye band
  for (const s of [-1, 1]) {
    a.save(); a.scale(1, s);
    a.strokeStyle = PAL.inkBlack; a.lineWidth = S * 0.0065; a.lineCap = 'round';
    // closed eye
    a.beginPath(); a.ellipse(rIn * 0.44, -rIn * 0.44, rIn * 0.19, rIn * 0.095, -0.25, 0, Math.PI * 2);
    a.fillStyle = '#FFF7E2'; a.fill(); a.stroke();
    a.beginPath(); a.arc(rIn * 0.44, -rIn * 0.44, rIn * 0.19, Math.PI * 0.15, Math.PI * 0.85);
    a.stroke();
    // brow
    a.beginPath();
    a.moveTo(rIn * 0.24, -rIn * 0.62);
    a.quadraticCurveTo(rIn * 0.48, -rIn * 0.74, rIn * 0.72, -rIn * 0.54);
    a.stroke();
    // nose
    a.beginPath();
    a.moveTo(rIn * 0.62, -rIn * 0.26);
    a.quadraticCurveTo(rIn * 0.86, -rIn * 0.14, rIn * 0.58, -rIn * 0.06);
    a.stroke();
    // cheek + lip
    a.beginPath();
    a.moveTo(rIn * 0.42, -rIn * 0.12);
    a.quadraticCurveTo(rIn * 0.60, -rIn * 0.06, rIn * 0.70, -rIn * 0.16);
    a.stroke();
    a.fillStyle = 'rgba(200,110,60,0.45)';
    a.beginPath(); a.ellipse(rIn * 0.50, -rIn * 0.10, rIn * 0.16, rIn * 0.06, 0.15, 0, Math.PI * 2);
    a.fill();
    // hatching on the shaded flank
    a.lineWidth = S * 0.0032;
    for (let i = 0; i < 9; i++) {
      const yy = -rIn * (0.20 + i * 0.055);
      a.beginPath();
      a.moveTo(-rIn * 0.86, yy); a.lineTo(-rIn * 0.52, yy + rIn * 0.03);
      a.stroke();
    }
    a.restore();
  }
  a.restore();

  // ---- galaxy eyeball ---------------------------------------------------
  a.save(); a.translate(cx - rIn * 0.20, cy);   // off-centre, as in the reference
  const eyeR = rIn * 0.60;
  for (const s of [-1, 1]) {                   // two orange almond rings
    a.save(); a.scale(1, s);
    a.beginPath();
    a.ellipse(0, -eyeR * 0.46, eyeR * 1.42, eyeR * 0.60, 0, 0, Math.PI * 2);
    a.fillStyle = '#0B0713'; a.fill();
    a.lineWidth = S * 0.016; a.strokeStyle = PAL.sunOrange; a.stroke();
    a.lineWidth = S * 0.005; a.strokeStyle = PAL.inkBlack; a.stroke();
    // starfield stipple
    a.save();
    a.beginPath(); a.ellipse(0, -eyeR * 0.46, eyeR * 1.38, eyeR * 0.56, 0, 0, Math.PI * 2); a.clip();
    for (let i = 0; i < 260; i++) {
      const px = (rnd() - 0.5) * eyeR * 2.8, py = -eyeR * 0.46 + (rnd() - 0.5) * eyeR * 1.2;
      a.fillStyle = rnd() < 0.15 ? '#BFE8FF' : '#FFFFFF';
      a.globalAlpha = 0.35 + rnd() * 0.65;
      a.beginPath(); a.arc(px, py, rnd() * 2.6 + 0.6, 0, Math.PI * 2); a.fill();
    }
    a.restore();
    a.restore();
  }
  // iris
  const ir = a.createRadialGradient(-eyeR * 0.15, -eyeR * 0.15, eyeR * 0.05, 0, 0, eyeR * 0.66);
  ir.addColorStop(0, '#DFF6FC');
  ir.addColorStop(0.55, PAL.irisBlue);
  ir.addColorStop(1, '#2E9BB8');
  a.beginPath(); a.arc(0, 0, eyeR * 0.66, 0, Math.PI * 2); a.fillStyle = ir; a.fill();
  a.lineWidth = S * 0.007; a.strokeStyle = PAL.inkBlack; a.stroke();
  a.save();                                     // cyan spokes
  a.strokeStyle = '#2FA9C6'; a.lineWidth = S * 0.0045;
  for (let i = 0; i < 34; i++) {
    const th = (i / 34) * Math.PI * 2;
    a.beginPath();
    a.moveTo(Math.cos(th) * eyeR * 0.26, Math.sin(th) * eyeR * 0.26);
    a.lineTo(Math.cos(th) * eyeR * 0.60, Math.sin(th) * eyeR * 0.60);
    a.stroke();
  }
  a.restore();
  a.beginPath(); a.arc(0, 0, eyeR * 0.27, 0, Math.PI * 2); a.fillStyle = '#0A0710'; a.fill();
  a.fillStyle = '#FFFFFF';
  a.beginPath(); a.arc(-eyeR * 0.16, -eyeR * 0.17, eyeR * 0.10, 0, Math.PI * 2); a.fill();
  a.globalAlpha = 0.7;
  a.beginPath(); a.arc(eyeR * 0.12, eyeR * 0.16, eyeR * 0.05, 0, Math.PI * 2); a.fill();
  a.globalAlpha = 1;
  a.restore();

  // ---- type -------------------------------------------------------------
  const bubble = (text, y, fill, size) => {
    a.save();
    a.font = `${size}px ${FONT_HEAVY}`;
    a.textAlign = 'center'; a.textBaseline = 'middle';
    a.lineJoin = 'round';
    a.lineWidth = size * 0.34; a.strokeStyle = PAL.inkBlack;
    a.lineJoin = 'round'; a.strokeText(text, cx, y);
    a.fillStyle = fill; a.fillText(text, cx, y);
    a.globalAlpha = 0.30; a.fillStyle = '#FFFFFF';           // top-lit sliver only
    a.save(); a.beginPath(); a.rect(0, y - size * 0.55, S, size * 0.26); a.clip();
    a.fillText(text, cx, y); a.restore(); a.globalAlpha = 1;
    a.restore();
  };
  // RESIN is 5 characters against CULTURE's 7, so it needs a larger size to carry
  // the same optical width — matched at the same size it reads noticeably weaker.
  bubble('RESIN', S * 0.145, PAL.sunOrange, S * 0.170);
  bubble('CULTURE', S * 0.855, PAL.teal, S * 0.135);
  a.save(); a.textAlign = 'center';
  foilCaps(a, 'HASH CLUB', cx, S * 0.945, S * 0.042, S * 0.012);
  a.restore();

  paperTooth(a, S, S, rnd, 10);

  const rw = S >> 1;
  const rough = makeCanvas(rw, rw);
  const r = rough.getContext('2d');
  r.fillStyle = 'rgb(133,133,133)'; r.fillRect(0, 0, rw, rw);   // print: 0.52
  paperTooth(r, rw, rw, mulberry32(0x6666), 22);
  const height = makeCanvas(rw, rw);
  const hc = height.getContext('2d');
  hc.fillStyle = 'rgb(120,120,120)'; hc.fillRect(0, 0, rw, rw);
  paperTooth(hc, rw, rw, mulberry32(0x7777), 42);

  return { albedo, roughness: rough, height, normal: heightToNormal(height, 1.3) };
}

// ==================================================== ROSIN ROUGHNESS SPECKLES
/**
 * repetitionSystem: rosin-wet-speckles. Roughness map ONLY — baking these into
 * the albedo would make the wetness die the moment the light moves.
 */
export function buildRosinMaps(S = 1024) {
  const rnd = mulberry32(0x205112);
  const rough = makeCanvas(S, S);
  const r = rough.getContext('2d');
  r.fillStyle = 'rgb(64,64,64)'; r.fillRect(0, 0, S, S);       // crown: 0.25
  // matte torn flank across the lower third
  const flank = r.createLinearGradient(0, S * 0.55, 0, S);
  flank.addColorStop(0, 'rgba(128,128,128,0)');
  flank.addColorStop(1, 'rgba(128,128,128,1)');
  r.fillStyle = flank; r.fillRect(0, S * 0.55, S, S * 0.45);
  for (let i = 0; i < 420; i++) {                             // wet speckles
    const px = rnd() * S, py = rnd() * S * 0.80;
    const rad = 2.5 + rnd() * 11;
    const g = r.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, 'rgb(8,8,8)');                           // 0.03 - a true wet dot
    g.addColorStop(0.45, 'rgb(26,26,26)');
    g.addColorStop(1, 'rgba(64,64,64,0)');
    r.fillStyle = g;
    r.beginPath(); r.arc(px, py, rad, 0, Math.PI * 2); r.fill();
  }
  const height = makeCanvas(S, S);
  const h = height.getContext('2d');
  h.fillStyle = 'rgb(128,128,128)'; h.fillRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) {                               // pour ridges
    const y = rnd() * S;
    const g = h.createLinearGradient(0, y - S * 0.05, 0, y + S * 0.05);
    g.addColorStop(0, 'rgba(128,128,128,0)');
    g.addColorStop(0.5, `rgba(${160 + rnd() * 40 | 0},${160 + rnd() * 40 | 0},${160 + rnd() * 40 | 0},0.6)`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    h.fillStyle = g; h.fillRect(0, y - S * 0.05, S, S * 0.10);
  }
  paperTooth(h, S, S, mulberry32(0x8888), 30);
  return { roughness: rough, height, normal: heightToNormal(height, 2.2) };
}
