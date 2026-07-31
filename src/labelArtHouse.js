/**
 * The house jar for meltshelf.com.
 *
 * Deliberately NOT a brand recreation. The Sour Diesel, Rodman and the reference jar packs
 * are all somebody else's artwork: fine as portfolio pieces on saibot.studio,
 * not fine as the hero of a live product, where putting a real brand's jar on
 * the landing page implies an endorsement nobody gave.
 *
 * So this is a collector's OWN jar. Dark glass, a small cream apothecary label
 * filled in by hand, and nothing else. That is also the more honest demo: the
 * product is about logging what YOU have, and a neutral jar with a written-on
 * label says that better than a designer package does.
 *
 * Everything structural runs AROUND the jar, never up it. A full-height
 * fillRect at a varying x wraps as a vertical stripe rather than a ring.
 */
import { mulberry32, heightToNormal } from './labelTextures.js';

const FONT_MONO = "'IBM Plex Mono', 'SFMono-Regular', Consolas, 'Courier New', monospace";
const FONT_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const HS = {
  glass: '#15171A',
  glassLift: '#242A30',
  paper: '#EDE7D9',
  paperShade: '#D6CDB8',
  ink: '#23211C',
  inkSoft: '#5E594E',
  accent: '#B4762F',
};

/** One label per jar, centred on the front. The rest is bare glass. */
const CARD = { cx: 0.5, w: 0.300, y0: 0.180, h: 0.620 };

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tooth(ctx, w, h, rnd, amount = 8) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

const at = (f, W) => (((f % 1) + 1) % 1) * W;

/** Dark glass ground with a soft top light. */
function glassGround(ctx, W, H) {
  ctx.fillStyle = HS.glass;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.00, 'rgba(96,112,126,0.34)');
  g.addColorStop(0.32, 'rgba(30,36,42,0.12)');
  g.addColorStop(0.76, 'rgba(12,14,17,0.00)');
  g.addColorStop(1.00, 'rgba(0,0,0,0.46)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // faint ring tooling so bare glass is not dead flat
  ctx.save();
  ctx.strokeStyle = 'rgba(150,168,182,0.030)';
  ctx.lineWidth = Math.max(1, H * 0.004);
  for (let y = H / 60; y < H; y += H / 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}

/** Hand-written-ish rule, for the fill-in lines on the card. */
function ruleLine(ctx, x0, x1, y, w, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.restore();
}

function mono(ctx, text, x, y, size, color, opts = {}) {
  ctx.save();
  ctx.font = `${opts.weight ?? 400} ${size}px ${opts.font ?? FONT_MONO}`;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'middle';
  if (opts.track) {
    const chars = text.split('');
    const w = chars.map((c) => ctx.measureText(c).width + opts.track);
    const total = w.reduce((a, b) => a + b, 0) - opts.track;
    let cx = opts.align === 'center' ? x - total / 2 : x;
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    for (let i = 0; i < chars.length; i++) { ctx.fillText(chars[i], cx, y); cx += w[i]; }
    ctx.restore();
    return total;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
  return ctx.measureText(text).width;
}

/**
 * The apothecary card. Slightly rotated and with a soft edge, so it reads as a
 * sticker applied by hand rather than printed packaging.
 */
function card(ctx, W, H, entry, opts = {}) {
  const cw = W * CARD.w, ch = H * CARD.h;
  const cx = at(CARD.cx, W) + (opts.offsetX ?? 0);
  const cy = H * (CARD.y0 + CARD.h / 2);
  const mask = opts.maskOnly;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.008);

  // paper
  if (mask) {
    ctx.fillStyle = mask;
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = H * 0.045;
  ctx.shadowOffsetY = H * 0.010;
  const pg = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
  pg.addColorStop(0.00, HS.paper);
  pg.addColorStop(0.55, '#E6DFCF');
  pg.addColorStop(1.00, HS.paperShade);
  ctx.fillStyle = pg;
  ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
  ctx.restore();

  // hairline border, inset
  ctx.strokeStyle = 'rgba(60,56,48,0.42)';
  ctx.lineWidth = Math.max(1.2, H * 0.005);
  ctx.strokeRect(-cw / 2 + cw * 0.035, -ch / 2 + ch * 0.045, cw * 0.930, ch * 0.910);

  const L = -cw / 2 + cw * 0.098;
  const R = cw / 2 - cw * 0.098;

  // header
  mono(ctx, 'MELTSHELF', 0, -ch * 0.360, ch * 0.070, HS.inkSoft,
    { align: 'center', track: ch * 0.030, font: FONT_SANS, weight: 600 });
  ruleLine(ctx, L, R, -ch * 0.290, Math.max(1, H * 0.004), 'rgba(60,56,48,0.34)');

  // the strain, the one big thing on the jar
  mono(ctx, entry.strain, 0, -ch * 0.150, ch * 0.150, HS.ink,
    { align: 'center', font: FONT_SANS, weight: 700 });
  mono(ctx, entry.process, 0, -ch * 0.020, ch * 0.070, HS.inkSoft,
    { align: 'center', track: ch * 0.018 });

  // fill-in rows, the journal conceit
  const rows = [['WASH', entry.wash], ['CURE', entry.cure], ['MELT', entry.melt]];
  rows.forEach(([k, v], i) => {
    const y = ch * (0.105 + i * 0.107);
    mono(ctx, k, L, y, ch * 0.058, HS.inkSoft, { track: ch * 0.010 });
    ruleLine(ctx, L + cw * 0.185, R, y + ch * 0.030, Math.max(1, H * 0.0035), 'rgba(60,56,48,0.26)');
    mono(ctx, v, R, y, ch * 0.062, HS.ink, { align: 'right' });
  });

  // batch code, small, bottom
  mono(ctx, entry.code, 0, ch * 0.400, ch * 0.052, HS.accent,
    { align: 'center', track: ch * 0.020 });

  ctx.restore();
}

const DEFAULT_ENTRY = {
  strain: 'PAPAYA',
  process: 'ICE WATER HASH',
  wash: '90 / 120u',
  cure: '72 HRS',
  melt: '6 STAR',
  code: 'MS-0417',
};

// =============================================================== BODY WRAP
export function buildBodyLabelHouse(W = 2048, entry = DEFAULT_ENTRY) {
  const H = Math.round(W / 7.96);
  const rnd = mulberry32(0x4D511);
  const albedo = makeCanvas(W, H);
  const a = albedo.getContext('2d');

  glassGround(a, W, H);
  for (const ox of [0, W, -W]) card(a, W, H, entry, { offsetX: ox });
  tooth(a, W, H, rnd, 6);

  const rw = W >> 1, rh = H >> 1;
  const rough = makeCanvas(rw, rh);
  const r = rough.getContext('2d');
  r.fillStyle = 'rgb(38,38,38)';                 // glass: glossy
  r.fillRect(0, 0, rw, rh);
  r.save(); r.scale(rw / W, rh / H);
  for (const ox of [0, W, -W]) card(r, W, H, entry, { offsetX: ox, maskOnly: 'rgb(206,206,206)' });
  r.restore();
  tooth(r, rw, rh, mulberry32(0x2121), 16);

  const height = makeCanvas(rw, rh);
  const hc = height.getContext('2d');
  hc.fillStyle = 'rgb(104,104,104)'; hc.fillRect(0, 0, rw, rh);
  hc.save(); hc.scale(rw / W, rh / H);
  for (const ox of [0, W, -W]) card(hc, W, H, entry, { offsetX: ox, maskOnly: 'rgb(168,168,168)' });
  hc.restore();
  tooth(hc, rw, rh, mulberry32(0x3232), 22);

  return {
    albedo, roughness: rough, height,
    normal: heightToNormal(height, 1.5),
    material: { envMapIntensity: 1.05, clearcoat: 0.55, clearcoatRoughness: 0.10 },
  };
}

// ============================================================== SKIRT WRAP
export function buildSkirtLabelHouse(W = 2048) {
  const H = Math.round(W / 11.1);
  const rnd = mulberry32(0x4D522);
  const albedo = makeCanvas(W, H);
  const a = albedo.getContext('2d');

  // plain black cap, knurled. No print at all: the card carries everything.
  a.fillStyle = '#101215';
  a.fillRect(0, 0, W, H);
  const g = a.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.00, 'rgba(120,134,146,0.30)');
  g.addColorStop(0.40, 'rgba(24,28,32,0.10)');
  g.addColorStop(1.00, 'rgba(0,0,0,0.52)');
  a.fillStyle = g; a.fillRect(0, 0, W, H);

  // knurling: fine vertical ribs are correct HERE, because a cap is gripped
  // around its circumference and the ribs run with the axis. This is the one
  // place on the jar where vertical is the right answer.
  a.save();
  const ribs = 150;
  for (let i = 0; i < ribs; i++) {
    const x = (i / ribs) * W;
    a.strokeStyle = i % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.30)';
    a.lineWidth = Math.max(1, W / ribs * 0.42);
    a.beginPath(); a.moveTo(x, H * 0.10); a.lineTo(x, H * 0.90); a.stroke();
  }
  a.restore();
  tooth(a, W, H, rnd, 5);

  const rw = W >> 1, rh = H >> 1;
  const rough = makeCanvas(rw, rh);
  const r = rough.getContext('2d');
  r.fillStyle = 'rgb(140,140,140)'; r.fillRect(0, 0, rw, rh);
  tooth(r, rw, rh, mulberry32(0x4343), 20);
  const height = makeCanvas(rw, rh);
  const hc = height.getContext('2d');
  hc.fillStyle = 'rgb(112,112,112)'; hc.fillRect(0, 0, rw, rh);
  hc.save(); hc.scale(rw / W, rh / H);
  for (let i = 0; i < 150; i++) {
    hc.fillStyle = i % 2 ? 'rgb(168,168,168)' : 'rgb(78,78,78)';
    hc.fillRect((i / 150) * W, H * 0.10, W / 150 * 0.5, H * 0.80);
  }
  hc.restore();
  tooth(hc, rw, rh, mulberry32(0x5454), 18);

  return {
    albedo, roughness: rough, height,
    normal: heightToNormal(height, 1.9),
    material: { envMapIntensity: 0.85, clearcoat: 0.30, clearcoatRoughness: 0.30 },
  };
}

// ================================================================= CAP TOP
export function buildTopLabelHouse(S = 1024) {
  const rnd = mulberry32(0x4D533);
  const albedo = makeCanvas(S, S);
  const a = albedo.getContext('2d');
  const cx = S / 2, cy = S / 2;

  a.fillStyle = '#101215'; a.fillRect(0, 0, S, S);
  const vig = a.createRadialGradient(cx, cy * 0.84, S * 0.04, cx, cy, S * 0.56);
  vig.addColorStop(0.0, 'rgba(120,134,146,0.26)');
  vig.addColorStop(1.0, 'rgba(0,0,0,0.58)');
  a.fillStyle = vig; a.fillRect(0, 0, S, S);

  // debossed wordmark, nothing else
  mono(a, 'MELTSHELF', cx, cy, S * 0.062, 'rgba(190,200,210,0.42)',
    { align: 'center', track: S * 0.028, font: FONT_SANS, weight: 600 });
  a.save();
  a.strokeStyle = 'rgba(190,200,210,0.18)';
  a.lineWidth = S * 0.004;
  a.beginPath(); a.arc(cx, cy, S * 0.300, 0, Math.PI * 2); a.stroke();
  a.restore();
  tooth(a, S, S, rnd, 5);

  const rw = S >> 1;
  const rough = makeCanvas(rw, rw);
  const r = rough.getContext('2d');
  r.fillStyle = 'rgb(150,150,150)'; r.fillRect(0, 0, rw, rw);
  tooth(r, rw, rw, mulberry32(0x6565), 18);
  const height = makeCanvas(rw, rw);
  const hc = height.getContext('2d');
  hc.fillStyle = 'rgb(120,120,120)'; hc.fillRect(0, 0, rw, rw);
  hc.save(); hc.scale(rw / S, rw / S);
  mono(hc, 'MELTSHELF', cx, cy, S * 0.062, 'rgb(76,76,76)',
    { align: 'center', track: S * 0.028, font: FONT_SANS, weight: 600 });
  hc.restore();
  tooth(hc, rw, rw, mulberry32(0x7676), 16);

  return {
    albedo, roughness: rough, height,
    normal: heightToNormal(height, 1.5),
    material: { envMapIntensity: 0.85, clearcoat: 0.30, clearcoatRoughness: 0.30 },
  };
}
