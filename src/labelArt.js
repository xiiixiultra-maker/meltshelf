/**
 * Wrap artwork for the Resin Culture jar, rebuilt from the close-up reference set
 * (ref2_png/IMG_8816..8819) which shows the full 360 degrees of the label.
 *
 * The first version treated the wrap as ONE block repeated three times around the
 * jar. It is not. It is a single continuous street scene with four distinct zones,
 * and three of them were missing entirely:
 *
 *   body wrap, going around:
 *     0.50  SOUR DIESEL BX2          wild-style, spiked, yellow->orange on green
 *     0.75  RESIN CULTURE            the brand, same treatment, smaller
 *     0.00  SMALL BATCH / SINGLE SOURCE   bubble caps, yellow->pink, filigree rule
 *     0.25  street tags, trash can, fire hydrant
 *   plus a gold strip: 2G . COLD-CURE . PREMIUM LIVE ROSIN . 90-139U
 *   plus a black/white checker band along the very bottom edge
 *
 *   cap skirt wrap:
 *     a full subway car over roughly a quarter of the circumference, city skyline
 *     across the rest, elevated rail line running all the way round
 */
import { PAL, mulberry32, heightToNormal } from './labelTextures.js';

const FONT_HEAVY = "'Arial Black', Impact, 'Haettenschweiler', sans-serif";
const FONT_COND = "Impact, 'Arial Narrow', 'Arial Black', sans-serif";

// Palette read off the close-up crops. The first pass was too saturated and too
// cartoon; the real print is warmer and more muted.
export const P2 = {
  brick: ['#C08B57', '#B87C48', '#C99A66', '#AE7040', '#BB8450'],
  brickMortar: '#7A5028',
  brickHi: 'rgba(255,226,186,0.16)',
  sprayPink: '#E87FA8',
  sprayHot: '#E4568C',
  tagRed: '#B8433A',
  tagBlue: '#4A6FA8',

  inkBlack: '#171310',
  gYellow: '#F5D93A',
  gOrange: '#EE7F2B',
  gGreen: '#4A9E3F',
  gGreenDark: '#2E6B2A',
  bubbleTop: '#F2DC55',
  bubbleBot: '#E8969E',

  gold: '#C8A24A',
  goldLite: '#EBD695',

  sky: '#55B4CE',
  skyHi: '#8FD2E2',
  cloud: '#E8F4F7',
  rail: '#B9BFC4',
  railDark: '#5A6066',

  bTan: '#C4A96B',
  bPurple: '#9A8FB5',
  bRose: '#C4808C',
  bOlive: '#8A8B6A',
  bSand: '#D4B45F',
  bNavy: '#3E4451',
  bBrick: '#A8524A',
  bTeal: '#7FA8A0',
  win: '#EAF2F5',
  winDim: '#9DBCC8',

  trainBody: '#9AA0A6',
  trainTop: '#C8CDD2',
  trainSkirt: '#43474B',
  trainWin: '#A8CFC9',
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tooth(ctx, w, h, rnd, amount = 10) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Running-bond brick, warmer and higher contrast than the first pass. */
function bricks(ctx, x0, y0, w, h, courses, rnd, ratio = 2.2) {
  const bh = h / courses, bw = bh * ratio;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = P2.brickMortar; ctx.fillRect(x0, y0, w, h);
  for (let r = -1; r < courses + 1; r++) {
    const y = y0 + r * bh, off = (r % 2) * bw * 0.5;
    for (let x = x0 - bw; x < x0 + w + bw; x += bw) {
      const px = x + off;
      ctx.fillStyle = P2.brick[Math.floor(rnd() * P2.brick.length)];
      ctx.fillRect(px + bw * 0.025, y + bh * 0.09, bw * 0.95, bh * 0.82);
      ctx.fillStyle = rnd() < 0.5
        ? `rgba(96,58,24,${0.04 + rnd() * 0.15})`
        : `rgba(255,224,182,${0.02 + rnd() * 0.11})`;
      ctx.fillRect(px + bw * 0.025, y + bh * 0.09, bw * 0.95, bh * 0.82);
      ctx.fillStyle = P2.brickHi;
      ctx.fillRect(px + bw * 0.025, y + bh * 0.09, bw * 0.95, bh * 0.10);
    }
  }
  ctx.restore();
}

/** Soft airbrushed spray wash, the pink haze all over the wall. */
function spray(ctx, cx, cy, rx, ry, color, alpha, rnd, freckles = 70) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, color); g.addColorStop(0.5, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha * 0.75; ctx.fillStyle = color;
  for (let i = 0; i < freckles; i++) {
    const a = rnd() * Math.PI * 2, d = rx * (0.7 + rnd() * 0.6);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * (ry / rx), rnd() * 2.4 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Wild-style caps. The reference letters carry a GREEN offset layer that hugs the
 * glyph (not a soft drop shadow), a hard black keyline, a vertical yellow->orange
 * fill, and spiked arrow serifs coming off the top edge. Returns the placement so
 * the roughness/height masks can reuse the exact same layout.
 */
export function wildWord(ctx, text, cx, cy, size, rnd, opts = {}) {
  const spacing = opts.spacing ?? 0.72;
  const stretch = opts.stretch ?? 1.26;
  const slant = opts.slant ?? -0.26;
  ctx.save();
  ctx.font = `${size}px ${FONT_HEAVY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = text.split('');
  const widths = chars.map((ch) => (ch === ' ' ? size * 0.26 : ctx.measureText(ch).width * spacing));
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  const placed = [];
  for (let i = 0; i < chars.length; i++) {
    const w = widths[i];
    if (chars[i] !== ' ') {
      placed.push({
        ch: chars[i], x: x + w / 2, y: cy + (rnd() - 0.5) * size * 0.16,
        rot: (rnd() - 0.5) * 0.22, sc: 1 + (rnd() - 0.5) * 0.18,
        sk: slant + (rnd() - 0.5) * 0.26, spike: rnd(),
      });
    }
    x += w;
  }

  const stamp = (dx, dy, styleFor, strokeW) => {
    for (const p of placed) {
      ctx.save();
      ctx.translate(p.x + dx, p.y + dy);
      ctx.rotate(p.rot);
      ctx.transform(1, 0, p.sk, 1, 0, 0);
      ctx.scale(p.sc, p.sc * stretch);
      ctx.font = `${size}px ${FONT_HEAVY}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const style = styleFor(ctx, size);
      if (strokeW) {
        ctx.lineJoin = 'miter'; ctx.miterLimit = 2.4;
        ctx.lineWidth = strokeW / p.sc; ctx.strokeStyle = style;
        ctx.strokeText(p.ch, 0, 0);
      } else { ctx.fillStyle = style; ctx.fillText(p.ch, 0, 0); }
      ctx.restore();
    }
  };

  // spiked arrow serifs, thrown off the top edge of about half the letters
  const spikes = (dx, dy, fill, stroke) => {
    for (const p of placed) {
      if (p.spike > 0.55) continue;
      ctx.save();
      ctx.translate(p.x + dx, p.y + dy - size * 0.30);
      ctx.rotate(p.rot - 0.25 + p.spike * 0.5);
      const L = size * (0.20 + p.spike * 0.30), Wd = size * 0.15;
      ctx.beginPath();
      ctx.moveTo(-Wd, 0); ctx.lineTo(Wd * 0.35, -L); ctx.lineTo(Wd * 0.9, -L * 0.42);
      ctx.lineTo(Wd * 1.15, 0);
      ctx.closePath();
      if (stroke) { ctx.lineJoin = 'miter'; ctx.lineWidth = size * 0.13; ctx.strokeStyle = stroke; ctx.stroke(); }
      ctx.fillStyle = fill; ctx.fill();
      ctx.restore();
    }
  };

  const flat = (c) => () => c;
  const off = size * 0.13;

  spikes(off, off * 0.9, P2.gGreen, P2.inkBlack);
  stamp(off, off * 0.9, flat(P2.inkBlack), size * 0.40);   // green layer, keylined
  stamp(off, off * 0.9, flat(P2.gGreen), size * 0.26);
  stamp(off, off * 0.9, flat(P2.gGreen), 0);

  spikes(0, 0, P2.gYellow, P2.inkBlack);
  stamp(0, 0, flat(P2.inkBlack), size * 0.30);             // hard black keyline
  stamp(0, 0, (c, sz) => {                                  // yellow -> orange
    const g = c.createLinearGradient(0, -sz * 0.56, 0, sz * 0.56);
    g.addColorStop(0.00, '#FFF07E');
    g.addColorStop(0.26, P2.gYellow);
    g.addColorStop(0.66, '#F0A227');
    g.addColorStop(1.00, P2.gOrange);
    return g;
  }, 0);
  ctx.restore();
  return placed;
}

/** Rounded bubble caps, yellow at the top fading to pink, heavy black outline. */
export function bubbleWord(ctx, text, cx, cy, size, rnd) {
  ctx.save();
  ctx.font = `${size}px ${FONT_HEAVY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = text.split('');
  const widths = chars.map((ch) => (ch === ' ' ? size * 0.34 : ctx.measureText(ch).width * 0.80));
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    const w = widths[i];
    if (chars[i] !== ' ') {
      const px = x + w / 2, py = cy + (rnd() - 0.5) * size * 0.10;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((rnd() - 0.5) * 0.13);
      ctx.scale(1 + (rnd() - 0.5) * 0.10, 1.22);
      ctx.font = `${size}px ${FONT_HEAVY}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.34; ctx.strokeStyle = P2.inkBlack;
      ctx.strokeText(chars[i], 0, 0);
      const g = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
      g.addColorStop(0.00, '#F7E64E');
      g.addColorStop(0.34, P2.bubbleTop);
      g.addColorStop(0.62, '#EFB58A');
      g.addColorStop(1.00, '#E27F92');
      ctx.fillStyle = g; ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
    x += w;
  }
  ctx.restore();
}

/** The ornate scroll rule that sits between SMALL BATCH and SINGLE SOURCE. */
function filigree(ctx, cx, cy, w, rnd) {
  ctx.save();
  ctx.strokeStyle = '#2E3A18'; ctx.lineWidth = Math.max(2.2, w * 0.007);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - w / 2, cy); ctx.lineTo(cx + w / 2, cy); ctx.stroke();
  const n = 16, step = w / n;
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + i * step + step * 0.5;
    const up = i % 2 === 0 ? -1 : 1;
    const r = step * (0.30 + rnd() * 0.16);
    ctx.beginPath();
    ctx.arc(x, cy + up * r * 0.55, r, 0, Math.PI * 1.55, up < 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + step * 0.34, cy - up * r * 0.4, r * 0.55, 0, Math.PI * 1.4, up > 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** Loose spray-can throw-up, used for the red and blue wall tags. */
function throwUp(ctx, cx, cy, w, h, color, rnd) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = h * 0.30;
  const segs = 5;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + h * 0.2);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    ctx.quadraticCurveTo(
      cx - w / 2 + w * (t - 0.5 / segs), cy + (rnd() - 0.5) * h * 1.5,
      cx - w / 2 + w * t, cy + (rnd() - 0.5) * h * 0.6,
    );
  }
  ctx.stroke();
  ctx.globalAlpha = 0.42; ctx.lineWidth = h * 0.62; ctx.stroke();
  ctx.restore();
}

function trashCan(ctx, x, yBase, w, h) {
  ctx.save();
  ctx.translate(x, yBase);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, '#7E8489'); g.addColorStop(0.4, '#C3C8CC'); g.addColorStop(1, '#6E7378');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, w * 0.06); ctx.fill();
  ctx.strokeStyle = P2.inkBlack; ctx.lineWidth = Math.max(1.6, w * 0.035); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,26,22,0.55)'; ctx.lineWidth = Math.max(1, w * 0.018);
  for (let i = 1; i < 6; i++) {
    const rx = -w / 2 + (w * i) / 6;
    ctx.beginPath(); ctx.moveTo(rx, -h * 0.86); ctx.lineTo(rx, -h * 0.08); ctx.stroke();
  }
  ctx.fillStyle = '#B7BCC1';
  ctx.beginPath(); ctx.ellipse(0, -h, w * 0.56, h * 0.10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = P2.inkBlack; ctx.lineWidth = Math.max(1.6, w * 0.035); ctx.stroke();
  ctx.restore();
}

function hydrant(ctx, x, yBase, w, h) {
  ctx.save();
  ctx.translate(x, yBase);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, '#8C2F26'); g.addColorStop(0.42, '#C8493C'); g.addColorStop(1, '#7E2A22');
  ctx.fillStyle = g; ctx.strokeStyle = P2.inkBlack;
  ctx.lineWidth = Math.max(1.5, w * 0.09);
  ctx.beginPath(); ctx.roundRect(-w * 0.5, -h * 0.72, w, h * 0.72, w * 0.16); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w * 0.68, -h * 0.10, w * 1.36, h * 0.10, w * 0.06); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -h * 0.72, w * 0.42, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w * 0.12, -h * 0.94, w * 0.24, h * 0.16, w * 0.05); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w * 0.86, -h * 0.52, w * 0.30, h * 0.16, w * 0.05); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(w * 0.56, -h * 0.52, w * 0.30, h * 0.16, w * 0.05); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ================================================================ BODY WRAP
export function buildBodyLabel2(W = 4096) {
  const H = Math.round(W / 7.96);          // true unwrapped aspect
  const rnd = mulberry32(0x5011D1E5);
  const albedo = makeCanvas(W, H);
  const a = albedo.getContext('2d');

  const WALL_TOP = 0;
  const GOLD_Y = H * 0.858;
  const CHECK_Y = H * 0.925;

  bricks(a, 0, WALL_TOP, W, CHECK_Y, 9, rnd);

  // grime, top and bottom
  const gr = a.createLinearGradient(0, 0, 0, CHECK_Y);
  gr.addColorStop(0, 'rgba(74,44,18,0.20)');
  gr.addColorStop(0.4, 'rgba(74,44,18,0.00)');
  gr.addColorStop(1, 'rgba(54,32,14,0.30)');
  a.fillStyle = gr; a.fillRect(0, 0, W, CHECK_Y);

  const at = (f) => ((f % 1) + 1) % 1 * W;

  // ---- pink spray washes, heaviest behind the two wordmarks ----------------
  spray(a, at(0.50), H * 0.44, W * 0.115, H * 0.40, P2.sprayPink, 0.80, rnd, 90);
  spray(a, at(0.56), H * 0.62, W * 0.060, H * 0.28, P2.sprayHot, 0.50, rnd);
  spray(a, at(0.44), H * 0.30, W * 0.050, H * 0.22, P2.sprayHot, 0.42, rnd);
  spray(a, at(0.75), H * 0.46, W * 0.085, H * 0.36, P2.sprayPink, 0.72, rnd, 80);
  spray(a, at(0.68), H * 0.55, W * 0.070, H * 0.34, P2.sprayHot, 0.55, rnd);
  spray(a, at(0.86), H * 0.40, W * 0.045, H * 0.26, P2.sprayPink, 0.40, rnd);
  spray(a, at(0.02), H * 0.70, W * 0.055, H * 0.24, P2.sprayPink, 0.34, rnd);
  spray(a, at(0.30), H * 0.62, W * 0.048, H * 0.24, P2.sprayHot, 0.30, rnd);

  // ---- zone D (0.25): street tags, trash can, hydrant ----------------------
  throwUp(a, at(0.255), H * 0.50, W * 0.085, H * 0.20, P2.tagRed, mulberry32(0x7A61));
  throwUp(a, at(0.205), H * 0.62, W * 0.055, H * 0.12, P2.tagRed, mulberry32(0x7A62));
  throwUp(a, at(0.325), H * 0.44, W * 0.050, H * 0.15, P2.tagBlue, mulberry32(0x7A63));
  a.save(); a.globalAlpha = 0.5;
  a.strokeStyle = P2.tagBlue; a.lineWidth = H * 0.018;
  a.strokeRect(at(0.318) - W * 0.022, H * 0.34, W * 0.044, H * 0.20);
  a.restore();
  trashCan(a, at(0.160), CHECK_Y - H * 0.02, W * 0.030, H * 0.34);
  hydrant(a, at(0.360), CHECK_Y - H * 0.02, W * 0.020, H * 0.36);

  // ---- zone A (0.50): SOUR DIESEL BX2 -------------------------------------
  const drawSour = (ox) => {
    wildWord(a, 'SOUR DIESEL', at(0.50) + ox, H * 0.38, H * 0.315, mulberry32(0xA11CE));
    wildWord(a, 'BX2', at(0.50) + ox + W * 0.012, H * 0.665, H * 0.27, mulberry32(0xB0B));
  };
  drawSour(0); drawSour(W); drawSour(-W);

  // ---- zone B (0.75): RESIN CULTURE ---------------------------------------
  const drawResin = (ox) => {
    wildWord(a, 'RESIN', at(0.75) + ox, H * 0.40, H * 0.245, mulberry32(0x4E51), { spacing: 0.74 });
    wildWord(a, 'CULTURE', at(0.75) + ox, H * 0.655, H * 0.235, mulberry32(0xC017), { spacing: 0.70 });
  };
  drawResin(0); drawResin(W); drawResin(-W);

  // ---- zone C (0.00): SMALL BATCH / SINGLE SOURCE -------------------------
  const drawBatch = (ox) => {
    bubbleWord(a, 'SMALL BATCH', at(0.0) + ox, H * 0.33, H * 0.170, mulberry32(0x5B47));
    filigree(a, at(0.0) + ox, H * 0.495, W * 0.115, mulberry32(0xF117));
    bubbleWord(a, 'SINGLE SOURCE', at(0.0) + ox, H * 0.665, H * 0.158, mulberry32(0x5051));
  };
  drawBatch(0); drawBatch(W); drawBatch(-W);

  // ---- gold product line ---------------------------------------------------
  a.save();
  a.fillStyle = 'rgba(22,15,8,0.34)';
  a.fillRect(0, GOLD_Y - H * 0.055, W, H * 0.105);
  a.restore();
  const LINE = '2G  ·  COLD-CURE  ·  PREMIUM LIVE ROSIN  ·  90-139U';
  a.save();
  a.font = `700 ${H * 0.082}px ${FONT_COND}`;
  a.textAlign = 'center'; a.textBaseline = 'middle';
  const goldGrad = a.createLinearGradient(0, GOLD_Y - H * 0.05, 0, GOLD_Y + H * 0.05);
  goldGrad.addColorStop(0, P2.goldLite);
  goldGrad.addColorStop(0.45, P2.gold);
  goldGrad.addColorStop(0.56, '#9A782C');
  goldGrad.addColorStop(1, P2.goldLite);
  // tile so the line runs unbroken all the way round, including under the wordmark
  const TILE = LINE + '  ·  ';
  const lineW = a.measureText(TILE).width;
  // floor, not round: rounding up makes pitch < lineW and the tiles overlap, which
  // collides the text into "90-139U2G" instead of leaving a clean separator gap.
  const reps = Math.max(2, Math.floor(W / lineW));
  const pitch = W / reps;
  for (let i = 0; i < reps; i++) {
    const cx = i * pitch + pitch / 2;
    a.fillStyle = 'rgba(26,18,6,0.6)'; a.fillText(TILE, cx + 2, GOLD_Y + 2);
    a.fillStyle = goldGrad; a.fillText(TILE, cx, GOLD_Y);
  }
  a.restore();

  // ---- checker band along the bottom edge ---------------------------------
  const cells = 10, cw = W / cells;   // wide taxi-checker blocks, as in the reference
  for (let i = 0; i < cells; i++) {
    a.fillStyle = i % 2 ? '#F2EFE9' : '#15120F';
    a.fillRect(i * cw, CHECK_Y, cw + 1, H - CHECK_Y);
  }
  tooth(a, W, H, rnd, 11);

  // ---- data maps: ink masks only, never the albedo pixels -----------------
  const rw = W >> 1, rh = H >> 1;
  const rough = makeCanvas(rw, rh);
  const r = rough.getContext('2d');
  r.fillStyle = 'rgb(148,148,148)'; r.fillRect(0, 0, rw, rh);      // paper 0.58
  r.save(); r.scale(rw / W, rh / H);
  r.fillStyle = 'rgb(71,71,71)';                                    // raised ink 0.28
  const inkMask = (fn) => { r.save(); fn(r); r.restore(); };
  inkMask(() => {
    for (const ox of [0, W, -W]) {
      wildWord(r, 'SOUR DIESEL', at(0.50) + ox, H * 0.38, H * 0.315, mulberry32(0xA11CE));
      wildWord(r, 'BX2', at(0.50) + ox + W * 0.012, H * 0.665, H * 0.27, mulberry32(0xB0B));
      wildWord(r, 'RESIN', at(0.75) + ox, H * 0.40, H * 0.245, mulberry32(0x4E51), { spacing: 0.74 });
      wildWord(r, 'CULTURE', at(0.75) + ox, H * 0.655, H * 0.235, mulberry32(0xC017), { spacing: 0.70 });
    }
  });
  r.fillStyle = 'rgb(77,77,77)';                                    // foil 0.30
  r.font = `700 ${H * 0.082}px ${FONT_COND}`;
  r.textAlign = 'center'; r.textBaseline = 'middle';
  for (let i = 0; i < reps; i++) r.fillText(TILE, i * pitch + pitch / 2, GOLD_Y);
  r.restore();
  tooth(r, rw, rh, mulberry32(0x2222), 26);

  const height = makeCanvas(rw, rh);
  const hc = height.getContext('2d');
  hc.fillStyle = 'rgb(118,118,118)'; hc.fillRect(0, 0, rw, rh);
  tooth(hc, rw, rh, mulberry32(0x3333), 46);

  const metal = makeCanvas(W >> 2, H >> 2);
  const m = metal.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, metal.width, metal.height);
  m.save(); m.scale(metal.width / W, metal.height / H);
  m.fillStyle = 'rgb(217,217,217)';
  m.font = `700 ${H * 0.082}px ${FONT_COND}`;
  m.textAlign = 'center'; m.textBaseline = 'middle';
  for (let i = 0; i < reps; i++) m.fillText(TILE, i * pitch + pitch / 2, GOLD_Y);
  m.restore();

  return { albedo, roughness: rough, height, metalness: metal, normal: heightToNormal(height, 1.6) };
}

// ============================================================== SKIRT WRAP
export function buildSkirtLabel2(W = 4096) {
  const H = Math.round(W / 11.1);
  const rnd = mulberry32(0x5C1F7A);
  const albedo = makeCanvas(W, H);
  const a = albedo.getContext('2d');
  const at = (f) => ((f % 1) + 1) % 1 * W;

  const sky = a.createLinearGradient(0, 0, 0, H * 0.80);
  sky.addColorStop(0, P2.skyHi);
  sky.addColorStop(0.4, P2.sky);
  sky.addColorStop(1, '#3F9EBC');
  a.fillStyle = sky; a.fillRect(0, 0, W, H);

  for (let i = 0; i < 15; i++) {                        // soft cloud wisps
    const cx = rnd() * W, cy = H * (0.05 + rnd() * 0.24), s = H * (0.06 + rnd() * 0.10);
    a.fillStyle = P2.cloud; a.globalAlpha = 0.62;
    a.beginPath();
    for (let k = 0; k < 5; k++) {
      a.arc(cx + (k - 2) * s * 0.6, cy + Math.sin(k) * s * 0.12, s * (0.5 + rnd() * 0.35), 0, Math.PI * 2);
    }
    a.fill(); a.globalAlpha = 1;
  }

  // ---- skyline, muted and hand-outlined -----------------------------------
  const kinds = [
    { c: P2.bTan, w: 0.052, h: 0.60, cols: 4, rows: 8, grid: true },
    { c: P2.bPurple, w: 0.040, h: 0.74, cols: 3, rows: 2, grid: false },
    { c: P2.bRose, w: 0.062, h: 0.40, cols: 4, rows: 3, grid: true },
    { c: P2.bOlive, w: 0.070, h: 0.46, cols: 3, rows: 3, grid: false },
    { c: P2.bSand, w: 0.055, h: 0.66, cols: 4, rows: 6, grid: true },
    { c: P2.bNavy, w: 0.038, h: 0.56, cols: 3, rows: 6, grid: true },
    { c: P2.bBrick, w: 0.048, h: 0.44, cols: 3, rows: 4, grid: true },
    { c: P2.bTeal, w: 0.058, h: 0.36, cols: 4, rows: 2, grid: false },
  ];
  const ground = H * 0.80;
  // the train owns roughly a quarter of the wrap; skyline fills the rest
  const TRAIN_C = 0.0, TRAIN_W = 0.27;
  let x = at(TRAIN_C + TRAIN_W / 2), ki = 0;
  const endX = at(TRAIN_C - TRAIN_W / 2) + W;
  while (x < endX) {
    const k = kinds[ki % kinds.length];
    const bw = W * k.w * (0.85 + rnd() * 0.35);
    const bh = H * k.h * (0.85 + rnd() * 0.3);
    const by = ground - bh;
    for (const ox of [0, -W, W]) {
      a.fillStyle = k.c; a.fillRect(x + ox, by, bw, bh);
      a.fillStyle = 'rgba(0,0,0,0.14)'; a.fillRect(x + ox + bw * 0.74, by, bw * 0.26, bh);
      a.strokeStyle = P2.inkBlack; a.lineWidth = Math.max(1.8, H * 0.013);
      a.strokeRect(x + ox, by, bw, bh);
      if (k.grid) {
        const mx = bw * 0.15, my = bh * 0.08;
        const cw = (bw - mx * 2) / k.cols, ch = (bh - my * 2) / k.rows;
        for (let c = 0; c < k.cols; c++) for (let rr = 0; rr < k.rows; rr++) {
          a.fillStyle = rnd() < 0.2 ? P2.win : P2.winDim;
          a.fillRect(x + ox + mx + c * cw + cw * 0.18, by + my + rr * ch + ch * 0.18, cw * 0.64, ch * 0.56);
          a.strokeStyle = 'rgba(23,19,16,0.75)'; a.lineWidth = Math.max(1, H * 0.006);
          a.strokeRect(x + ox + mx + c * cw + cw * 0.18, by + my + rr * ch + ch * 0.18, cw * 0.64, ch * 0.56);
        }
      } else {
        a.strokeStyle = 'rgba(23,19,16,0.55)'; a.lineWidth = Math.max(1.2, H * 0.008);
        for (let c = 1; c < k.cols; c++) {
          const lx = x + ox + (bw * c) / k.cols;
          a.beginPath(); a.moveTo(lx, by + bh * 0.05); a.lineTo(lx, by + bh * 0.95); a.stroke();
        }
      }
    }
    x += bw * (1.03 + rnd() * 0.18);
    ki++;
  }

  // ---- elevated rail line, all the way around -----------------------------
  const railY = H * 0.665;
  a.fillStyle = P2.railDark; a.fillRect(0, railY + H * 0.052, W, H * 0.020);
  a.fillStyle = P2.rail; a.fillRect(0, railY, W, H * 0.032);
  a.strokeStyle = P2.inkBlack; a.lineWidth = Math.max(1.6, H * 0.010);
  a.beginPath(); a.moveTo(0, railY); a.lineTo(W, railY); a.stroke();
  a.beginPath(); a.moveTo(0, railY + H * 0.032); a.lineTo(W, railY + H * 0.032); a.stroke();
  for (let px = 0; px < W; px += W * 0.026) {
    a.fillStyle = P2.rail; a.fillRect(px, railY + H * 0.072, H * 0.020, H * 0.10);
  }

  // ---- the subway car -----------------------------------------------------
  const drawTrain = (ox) => {
    const tw = W * TRAIN_W, tx = at(TRAIN_C) - tw / 2 + ox;
    const ty = H * 0.05, th = H * 0.60;
    a.save();
    const body = a.createLinearGradient(0, ty, 0, ty + th);
    body.addColorStop(0, P2.trainTop);
    body.addColorStop(0.35, P2.trainBody);
    body.addColorStop(1, '#7C8288');
    a.fillStyle = body;
    a.beginPath(); a.roundRect(tx, ty, tw, th, H * 0.05); a.fill();
    a.strokeStyle = P2.inkBlack; a.lineWidth = Math.max(2, H * 0.014); a.stroke();
    a.fillStyle = P2.trainSkirt;
    a.fillRect(tx, ty + th * 0.80, tw, th * 0.26);
    a.strokeRect(tx, ty + th * 0.80, tw, th * 0.26);
    a.strokeStyle = 'rgba(23,19,16,0.5)'; a.lineWidth = Math.max(1.2, H * 0.007);
    a.beginPath(); a.moveTo(tx, ty + th * 0.72); a.lineTo(tx + tw, ty + th * 0.72); a.stroke();
    // windows: wide panes with a narrow pair of door lights between
    const panes = 5;
    for (let i = 0; i < panes; i++) {
      const pw = tw / panes;
      const px = tx + i * pw;
      if (i === 2) {
        for (let d = 0; d < 2; d++) {
          const dx = px + pw * (0.16 + d * 0.42);
          a.fillStyle = P2.trainWin;
          a.beginPath(); a.roundRect(dx, ty + th * 0.14, pw * 0.26, th * 0.46, H * 0.02); a.fill();
          a.strokeStyle = P2.inkBlack; a.lineWidth = Math.max(1.6, H * 0.010); a.stroke();
        }
        a.strokeStyle = 'rgba(23,19,16,0.7)'; a.lineWidth = Math.max(1.4, H * 0.009);
        a.beginPath(); a.moveTo(px + pw * 0.5, ty + th * 0.05);
        a.lineTo(px + pw * 0.5, ty + th * 0.78); a.stroke();
      } else {
        a.fillStyle = P2.trainWin;
        a.beginPath(); a.roundRect(px + pw * 0.13, ty + th * 0.14, pw * 0.74, th * 0.44, H * 0.03); a.fill();
        a.strokeStyle = P2.inkBlack; a.lineWidth = Math.max(1.8, H * 0.012); a.stroke();
        a.save();                                    // glass sheen
        a.beginPath(); a.roundRect(px + pw * 0.13, ty + th * 0.14, pw * 0.74, th * 0.44, H * 0.03); a.clip();
        a.globalAlpha = 0.5; a.strokeStyle = '#FFFFFF'; a.lineWidth = H * 0.03;
        a.beginPath(); a.moveTo(px + pw * 0.1, ty + th * 0.52); a.lineTo(px + pw * 0.55, ty + th * 0.08); a.stroke();
        a.restore();
      }
    }
    a.restore();
  };
  drawTrain(0); drawTrain(W); drawTrain(-W);

  // ---- brick wall top courses, so the scene continues onto the body -------
  bricks(a, 0, H * 0.80, W, H * 0.175, 3, rnd);
  const gr2 = a.createLinearGradient(0, H * 0.80, 0, H);
  gr2.addColorStop(0, 'rgba(66,40,18,0.30)');
  gr2.addColorStop(1, 'rgba(66,40,18,0.02)');
  a.fillStyle = gr2; a.fillRect(0, H * 0.80, W, H * 0.20);
  a.fillStyle = 'rgba(20,16,12,0.85)';
  a.fillRect(0, H * 0.975, W, H * 0.025);
  tooth(a, W, H, rnd, 11);

  const rw = W >> 1, rh = H >> 1;
  const rough = makeCanvas(rw, rh);
  const r = rough.getContext('2d');
  r.fillStyle = 'rgb(148,148,148)'; r.fillRect(0, 0, rw, rh);
  tooth(r, rw, rh, mulberry32(0x4444), 24);
  const height = makeCanvas(rw, rh);
  const hc = height.getContext('2d');
  hc.fillStyle = 'rgb(120,120,120)'; hc.fillRect(0, 0, rw, rh);
  tooth(hc, rw, rh, mulberry32(0x5555), 44);

  return { albedo, roughness: rough, height, normal: heightToNormal(height, 1.4) };
}
