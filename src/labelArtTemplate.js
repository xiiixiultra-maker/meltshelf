/**
 * ============================================================================
 * JAR LABEL TEMPLATE — edit CONFIG, get a jar.
 * ============================================================================
 *
 * This is a starter pack. Everything you'd normally want to change lives in the
 * CONFIG object below; the drawing code underneath reads it and should not need
 * touching until you want a shape that isn't here.
 *
 * HOW TO USE IT
 *
 *   import { makeTemplatePack, CONFIG } from './labelArtTemplate.js';
 *   const pack = makeTemplatePack({ ...CONFIG, strain: 'GELATO 41' });
 *   createResinCultureJarModel({ label: pack, textureSize: 2048 });
 *
 * Or open studio.html and design it with sliders, then press Copy config and
 * paste the result back over CONFIG here.
 *
 * ---------------------------------------------------------------------------
 * THE FIVE TRAPS
 *
 * Every one of these cost real time on the jars already built. They are not
 * hypothetical.
 *
 * 1. HORIZONTAL, NOT VERTICAL.
 *    The canvas wraps around the jar: x goes around the circumference, y goes
 *    up. So `fillRect(x, 0, w, H)` is a full-height bar, which wraps as a
 *    VERTICAL STRIPE up the side. To band around the jar you want
 *    `fillRect(0, y, W, h)`. Getting this backwards put a picket fence down
 *    one jar and it was not obvious until it was on a cylinder.
 *
 * 2. GRADIENTS MUST BE BUILT IN THE LETTER'S LOCAL SPACE.
 *    createLinearGradient uses the CURRENT transform. If you build one in
 *    canvas space and then translate() to each letter, every glyph lands past
 *    the gradient's end stop and fills with the clamped end colour. Build it
 *    inside the loop, after the transform. That is why fills here are passed
 *    as callbacks rather than as styles.
 *
 * 3. TILE WITH Math.floor, NEVER Math.round.
 *    Rounding up makes the pitch smaller than the tile, the copies overlap,
 *    and the text collides into itself. One jar shipped reading "90-139U2G"
 *    before this was found.
 *
 * 4. MASKS MUST RE-STAMP THE IDENTICAL LAYOUT.
 *    The roughness / metalness / height maps redraw the same artwork in flat
 *    greys. If they use different sizes or seeds than the albedo, the shine
 *    sits beside the ink instead of on it. Pass the same values, and the same
 *    seed, or drive both from one function like this file does.
 *
 * 5. TEXT IS BOUNDED BY ITS ZONE, NOT BY THE CANVAS.
 *    Zones sit every quarter turn, so a run wider than ~0.21 of the canvas
 *    overlaps its neighbour once the wrap repeats. `text()` takes maxWidth and
 *    shrinks to fit. Use it.
 *
 * Bonus trap: hex literals must actually be hex. `0xPEARL0` is not a number,
 * and neither is `0x5UNEYE`. Both were written in earnest.
 * ---------------------------------------------------------------------------
 */
import { mulberry32, heightToNormal } from './labelTextures.js';

/** ==========================================================================
 *  CONFIG — this is the part you edit.
 *  ========================================================================== */
export const CONFIG = {
  name: 'My jar',

  // ---- what it says -------------------------------------------------------
  strain: 'PAPAYA',
  subtitle: 'ICE WATER HASH',
  rows: [['WASH', '90 / 120u'], ['CURE', '72 HRS'], ['MELT', '6 STAR']],
  code: 'MS-0417',
  brand: 'MELTSHELF',

  // ---- the glass ----------------------------------------------------------
  ground: {
    color: '#15171A',      // the jar body between the printed bits
    sheen: 0.34,           // 0 flat, 1 strong top light
    rings: 0.030,          // faint horizontal tooling, 0 to turn off
  },

  // ---- the paper card (set show:false for a printed wrap instead) ---------
  card: {
    show: true,
    paper: '#EDE7D9',
    ink: '#23211C',
    inkSoft: '#5E594E',
    accent: '#B4762F',
    w: 0.300,              // fraction of the circumference
    y: 0.180,              // top edge, fraction of label height
    h: 0.620,
    rotate: -0.008,        // radians, a hand-applied sticker is never straight
  },

  // ---- a big wordmark across the front (card:false suits this) ------------
  wordmark: {
    show: false,
    text: 'PAPAYA',
    size: 0.30,            // fraction of label height
    y: 0.46,
    chrome: ['#FBEFD2', '#F0D8A8', '#D8C090', '#C0A878', '#A89060'],
    keyline: '#0A0A0C',
  },

  // ---- the spec line round the bottom ------------------------------------
  strip: {
    show: false,
    y: 0.860, h: 0.092,
    fill: 'rgba(255,255,255,0.05)',
    ink: 'rgba(238,242,246,0.86)',
    rule: 'rgba(143,205,247,0.30)',
    text: 'SOLVENTLESS  ·  SINGLE SOURCE  ·  1G',
  },

  // ---- your own artwork ---------------------------------------------------
  // Set any of these to a LOADED HTMLImageElement / ImageBitmap and it is used
  // as the wrap instead of the drawn artwork. Everything above is ignored for
  // that surface. Use the studio's upload buttons, or see WRAP for the sizes.
  art: { body: null, skirt: null, top: null, roughness: 0.42, relief: 0.35 },

  // ---- the cap ------------------------------------------------------------
  cap: {
    color: '#101215',
    knurl: true,
    topText: 'MELTSHELF',
    topRing: 'rgba(190,200,210,0.18)',
  },
};

/** Zone bound. Wider than this and wrapped copies collide. See trap 5. */
const ZONE_W = 0.21;

/**
 * TRUE wrap aspects, measured off the meshes the labels are painted on.
 *
 *   body   cylinder r 24.96, h 21.80  ->  circumference 156.83  ->  7.194 : 1
 *   skirt  cylinder r 25.06, h 15.40  ->  circumference 157.46  -> 10.224 : 1
 *
 * The DRAWN artwork in this file is authored against the older 7.96 and 11.1
 * figures, which stretch it about 10% vertically on the jar. That is invisible
 * for hand-tuned type and rules, so those are left alone rather than
 * re-tuning three finished jars.
 *
 * UPLOADED artwork is different: you drew it square in Illustrator and you
 * expect it back square. So the image path builds its canvas at the true
 * aspect, where the mapping is 1:1 and a circle stays a circle.
 */
export const WRAP = {
  body:  { aspect: 7.194,  height: (w) => Math.round(w / 7.194) },
  skirt: { aspect: 10.224, height: (w) => Math.round(w / 10.224) },
  top:   { aspect: 1 },
};

/**
 * Paint a loaded image across a wrap, cover-style, and derive its data maps.
 *
 * Relief comes from luminance: light ink sits proud, which is how a printed or
 * foiled label actually behaves. Kept gentle by default because a full-strength
 * normal from arbitrary artwork looks like embossed wallpaper.
 */
function artWrap(img, W, aspect, cfg) {
  const H = Math.round(W / aspect);
  const albedo = mk(W, H); const a = albedo.getContext('2d');
  a.fillStyle = '#000'; a.fillRect(0, 0, W, H);
  const iw = img.width, ih = img.height;
  const scale = Math.max(W / iw, H / ih);          // cover, never letterbox
  const dw = iw * scale, dh = ih * scale;
  a.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  const rw = W >> 1, rh = H >> 1;
  const src = a.getImageData(0, 0, W, H);
  const rough = mk(rw, rh); const r = rough.getContext('2d');
  const height = mk(rw, rh); const hc = height.getContext('2d');
  const rImg = r.createImageData(rw, rh);
  const hImg = hc.createImageData(rw, rh);
  const base = Math.round(255 * (cfg.art.roughness ?? 0.42));
  const relief = cfg.art.relief ?? 0.35;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const si = ((y * 2) * W + x * 2) * 4;
      const lum = (src.data[si] * 0.299 + src.data[si + 1] * 0.587 + src.data[si + 2] * 0.114) / 255;
      const di = (y * rw + x) * 4;
      // ink is duller than bare stock; brighter pixels read as heavier coverage
      const rv = Math.max(12, Math.min(255, base + (lum - 0.5) * 120));
      const hv = Math.max(0, Math.min(255, 110 + (lum - 0.5) * 255 * relief));
      rImg.data[di] = rImg.data[di + 1] = rImg.data[di + 2] = rv; rImg.data[di + 3] = 255;
      hImg.data[di] = hImg.data[di + 1] = hImg.data[di + 2] = hv; hImg.data[di + 3] = 255;
    }
  }
  r.putImageData(rImg, 0, 0);
  hc.putImageData(hImg, 0, 0);
  return { albedo, roughness: rough, height, normal: heightToNormal(height, 1.4),
           material: { envMapIntensity: 1.05, clearcoat: 0.45, clearcoatRoughness: 0.16 } };
}

const FONT_MONO = "'IBM Plex Mono','SFMono-Regular',Consolas,monospace";
const FONT_SANS = "'Archivo','Helvetica Neue',Helvetica,Arial,sans-serif";
const FONT_HEAVY = "'Arial Black',Impact,sans-serif";

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const at = (f, W) => (((f % 1) + 1) % 1) * W;

function tooth(ctx, w, h, rnd, amount = 6) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Text with optional letter tracking, bounded by maxWidth.
 * Shrinks size and tracking together rather than clipping. Trap 5.
 */
function text(ctx, str, x, y, size, color, o = {}) {
  ctx.save();
  const font = o.font ?? FONT_SANS, weight = o.weight ?? 500;
  let track = o.track ?? 0;
  if (o.maxWidth) {
    ctx.font = `${weight} ${size}px ${font}`;
    const raw = str.split('').reduce((s, c) => s + ctx.measureText(c).width + track, 0) - track;
    if (raw > o.maxWidth) { const k = o.maxWidth / raw; size *= k; track *= k; }
  }
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textBaseline = 'middle';
  const chars = str.split('');
  const w = chars.map((c) => ctx.measureText(c).width + track);
  const total = w.reduce((a, b) => a + b, 0) - track;
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  for (let i = 0; i < chars.length; i++) { ctx.fillText(chars[i], cx, y); cx += w[i]; }
  ctx.restore();
  return total;
}

/**
 * Chrome lettering. The fill is a CALLBACK so the gradient is created after the
 * per-letter transform, in the letter's own space. Trap 2.
 */
function chromeWord(ctx, str, cx, cy, size, ramp, keyline, rnd, o = {}) {
  ctx.save();
  ctx.font = `${size}px ${FONT_HEAVY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = str.split('');
  const widths = chars.map((c) => ctx.measureText(c).width * 0.88);
  const total = widths.reduce((a, b) => a + b, 0);
  const placed = [];
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    placed.push({
      ch: chars[i], x: x + widths[i] / 2,
      y: cy + (rnd() - 0.5) * size * 0.14,
      rot: (rnd() - 0.5) * 0.20, sc: 1 + (rnd() - 0.5) * 0.12,
    });
    x += widths[i];
  }
  const stamp = (dx, dy, styleFor, strokeW) => {
    for (const p of placed) {
      ctx.save();
      ctx.translate(p.x + dx, p.y + dy);
      ctx.rotate(p.rot);
      ctx.scale(p.sc, p.sc * 1.08);
      ctx.font = `${size}px ${FONT_HEAVY}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const style = styleFor(ctx, size);          // <- built in LOCAL space
      if (strokeW) {
        ctx.lineJoin = 'round'; ctx.lineWidth = strokeW / p.sc;
        ctx.strokeStyle = style; ctx.strokeText(p.ch, 0, 0);
      } else { ctx.fillStyle = style; ctx.fillText(p.ch, 0, 0); }
      ctx.restore();
    }
  };
  const flat = (c) => () => c;
  if (o.maskOnly) {
    stamp(0, 0, flat(o.maskOnly), size * 0.40);
    stamp(0, 0, flat(o.maskOnly), 0);
    ctx.restore(); return;
  }
  stamp(size * 0.045, size * 0.08, flat('rgba(0,0,0,0.5)'), size * 0.44);
  stamp(0, 0, flat(keyline), size * 0.38);
  stamp(0, 0, (c, sz) => {
    const g = c.createLinearGradient(0, -sz * 0.56, 0, sz * 0.56);
    ramp.forEach((col, i) => g.addColorStop(i / (ramp.length - 1), col));
    return g;
  }, 0);
  ctx.restore();
}

/** Horizontal ground. Bands run round the jar, never up it. Trap 1. */
function ground(ctx, W, H, cfg) {
  ctx.fillStyle = cfg.ground.color;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.00, `rgba(140,160,178,${cfg.ground.sheen})`);
  g.addColorStop(0.34, 'rgba(30,36,42,0.10)');
  g.addColorStop(0.78, 'rgba(10,12,15,0.00)');
  g.addColorStop(1.00, 'rgba(0,0,0,0.46)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (cfg.ground.rings > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(150,168,182,${cfg.ground.rings})`;
    ctx.lineWidth = Math.max(1, H * 0.004);
    for (let y = H / 60; y < H; y += H / 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();   // full WIDTH
    }
    ctx.restore();
  }
}

/** The apothecary card. Set mask to draw it flat into a data map. Trap 4. */
function card(ctx, W, H, cfg, ox, mask) {
  const c = cfg.card;
  const cw = W * c.w, ch = H * c.h;
  const cx = at(0.5, W) + ox, cy = H * (c.y + c.h / 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(c.rotate);
  if (mask) {
    ctx.fillStyle = mask;
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore(); return;
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = H * 0.045; ctx.shadowOffsetY = H * 0.010;
  const pg = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
  pg.addColorStop(0, c.paper); pg.addColorStop(1, '#D6CDB8');
  ctx.fillStyle = pg; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
  ctx.restore();

  ctx.strokeStyle = 'rgba(60,56,48,0.42)';
  ctx.lineWidth = Math.max(1.2, H * 0.005);
  ctx.strokeRect(-cw / 2 + cw * 0.035, -ch / 2 + ch * 0.045, cw * 0.930, ch * 0.910);

  const L = -cw / 2 + cw * 0.098, R = cw / 2 - cw * 0.098;
  text(ctx, cfg.brand, 0, -ch * 0.360, ch * 0.070, c.inkSoft,
    { align: 'center', track: ch * 0.030, weight: 600, maxWidth: cw * 0.80 });
  ctx.strokeStyle = 'rgba(60,56,48,0.34)';
  ctx.lineWidth = Math.max(1, H * 0.004);
  ctx.beginPath(); ctx.moveTo(L, -ch * 0.290); ctx.lineTo(R, -ch * 0.290); ctx.stroke();

  text(ctx, cfg.strain, 0, -ch * 0.150, ch * 0.150, c.ink,
    { align: 'center', weight: 800, maxWidth: cw * 0.86 });
  text(ctx, cfg.subtitle, 0, -ch * 0.020, ch * 0.070, c.inkSoft,
    { align: 'center', track: ch * 0.018, maxWidth: cw * 0.86 });

  cfg.rows.slice(0, 3).forEach(([k, v], i) => {
    const y = ch * (0.105 + i * 0.107);
    text(ctx, k, L, y, ch * 0.058, c.inkSoft, { track: ch * 0.010 });
    ctx.strokeStyle = 'rgba(60,56,48,0.26)';
    ctx.lineWidth = Math.max(1, H * 0.0035);
    ctx.beginPath(); ctx.moveTo(L + cw * 0.185, y + ch * 0.030); ctx.lineTo(R, y + ch * 0.030); ctx.stroke();
    text(ctx, v, R, y, ch * 0.062, c.ink, { align: 'right' });
  });

  text(ctx, cfg.code, 0, ch * 0.400, ch * 0.052, c.accent,
    { align: 'center', track: ch * 0.020, maxWidth: cw * 0.70 });
  ctx.restore();
}

/** The spec line, tiled with FLOOR so copies never overlap. Trap 3. */
function strip(ctx, W, H, cfg, mask) {
  const s = cfg.strip;
  const y0 = H * s.y, sh = H * s.h;
  if (mask) { ctx.fillStyle = mask; ctx.fillRect(0, y0, W, sh); return; }
  ctx.save();
  ctx.fillStyle = s.fill; ctx.fillRect(0, y0, W, sh);
  ctx.strokeStyle = s.rule; ctx.lineWidth = Math.max(1.2, H * 0.004);
  ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, y0 + sh); ctx.lineTo(W, y0 + sh); ctx.stroke();
  const size = sh * 0.46, track = sh * 0.10;
  ctx.font = `600 ${size}px ${FONT_MONO}`;
  const tile = s.text + '   ·   ';
  const tw = tile.split('').reduce((a, c) => a + ctx.measureText(c).width + track, 0);
  const reps = Math.max(1, Math.floor(W / tw));       // FLOOR, not round
  const pitch = W / reps;
  for (let i = 0; i < reps; i++) {
    text(ctx, tile, i * pitch + pitch / 2, y0 + sh * 0.52, size, s.ink,
      { align: 'center', track, font: FONT_MONO });
  }
  ctx.restore();
}

/** Everything printed on the body, in one place so masks match exactly. */
function bodyArt(ctx, W, H, cfg, rnd, mask) {
  for (const ox of [0, W, -W]) {
    if (cfg.card.show) card(ctx, W, H, cfg, ox, mask);
    if (cfg.wordmark.show) {
      const w = cfg.wordmark;
      chromeWord(ctx, w.text, at(0.5, W) + ox, H * w.y, H * w.size,
        w.chrome, w.keyline, mulberry32(0x77A1), { maskOnly: mask });
    }
  }
  if (cfg.strip.show) strip(ctx, W, H, cfg, mask);
}

// ============================================================== THE PACK
export function makeTemplatePack(cfg = CONFIG) {
  const C = { ...CONFIG, ...cfg };

  const body = (W = 2048) => {
    if (C.art?.body) return artWrap(C.art.body, W, WRAP.body.aspect, C);
    const H = Math.round(W / 7.96);         // see WRAP: the drawn art predates the fix
    const rnd = mulberry32(0x7E511);
    const albedo = mk(W, H); const a = albedo.getContext('2d');
    ground(a, W, H, C);
    bodyArt(a, W, H, C, rnd, null);
    tooth(a, W, H, rnd, 6);

    const rw = W >> 1, rh = H >> 1;
    const rough = mk(rw, rh); const r = rough.getContext('2d');
    r.fillStyle = 'rgb(38,38,38)'; r.fillRect(0, 0, rw, rh);          // glass: glossy
    r.save(); r.scale(rw / W, rh / H);
    bodyArt(r, W, H, C, rnd, 'rgb(206,206,206)');                    // print: matte
    r.restore();
    tooth(r, rw, rh, mulberry32(0x2121), 16);

    const height = mk(rw, rh); const hc = height.getContext('2d');
    hc.fillStyle = 'rgb(104,104,104)'; hc.fillRect(0, 0, rw, rh);
    hc.save(); hc.scale(rw / W, rh / H);
    bodyArt(hc, W, H, C, rnd, 'rgb(168,168,168)');                   // print: proud
    hc.restore();
    tooth(hc, rw, rh, mulberry32(0x3232), 22);

    return { albedo, roughness: rough, height, normal: heightToNormal(height, 1.5),
             material: { envMapIntensity: 1.05, clearcoat: 0.55, clearcoatRoughness: 0.10 } };
  };

  const skirt = (W = 2048) => {
    if (C.art?.skirt) return artWrap(C.art.skirt, W, WRAP.skirt.aspect, C);
    const H = Math.round(W / 11.1);
    const rnd = mulberry32(0x7E522);
    const albedo = mk(W, H); const a = albedo.getContext('2d');
    a.fillStyle = C.cap.color; a.fillRect(0, 0, W, H);
    const g = a.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(120,134,146,0.30)');
    g.addColorStop(0.4, 'rgba(24,28,32,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0.52)');
    a.fillStyle = g; a.fillRect(0, 0, W, H);
    if (C.cap.knurl) {
      // Vertical ribs are CORRECT here and only here: a cap is gripped around
      // its circumference, so the ribs run with the axis. Everywhere else on
      // the jar, vertical is the bug from trap 1.
      const ribs = 150;
      for (let i = 0; i < ribs; i++) {
        a.strokeStyle = i % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.30)';
        a.lineWidth = Math.max(1, W / ribs * 0.42);
        a.beginPath(); a.moveTo((i / ribs) * W, H * 0.10); a.lineTo((i / ribs) * W, H * 0.90); a.stroke();
      }
    }
    tooth(a, W, H, rnd, 5);
    const rw = W >> 1, rh = H >> 1;
    const rough = mk(rw, rh); const r = rough.getContext('2d');
    r.fillStyle = 'rgb(140,140,140)'; r.fillRect(0, 0, rw, rh);
    tooth(r, rw, rh, mulberry32(0x4343), 20);
    const height = mk(rw, rh); const hc = height.getContext('2d');
    hc.fillStyle = 'rgb(112,112,112)'; hc.fillRect(0, 0, rw, rh);
    if (C.cap.knurl) {
      hc.save(); hc.scale(rw / W, rh / H);
      for (let i = 0; i < 150; i++) {
        hc.fillStyle = i % 2 ? 'rgb(168,168,168)' : 'rgb(78,78,78)';
        hc.fillRect((i / 150) * W, H * 0.10, W / 150 * 0.5, H * 0.80);
      }
      hc.restore();
    }
    tooth(hc, rw, rh, mulberry32(0x5454), 18);
    return { albedo, roughness: rough, height, normal: heightToNormal(height, 1.9),
             material: { envMapIntensity: 0.85, clearcoat: 0.30, clearcoatRoughness: 0.30 } };
  };

  const top = (S = 1024) => {
    if (C.art?.top) return artWrap(C.art.top, S, 1, C);
    const rnd = mulberry32(0x7E533);
    const albedo = mk(S, S); const a = albedo.getContext('2d');
    const cx = S / 2, cy = S / 2;
    a.fillStyle = C.cap.color; a.fillRect(0, 0, S, S);
    const vig = a.createRadialGradient(cx, cy * 0.84, S * 0.04, cx, cy, S * 0.56);
    vig.addColorStop(0, 'rgba(120,134,146,0.26)');
    vig.addColorStop(1, 'rgba(0,0,0,0.58)');
    a.fillStyle = vig; a.fillRect(0, 0, S, S);
    text(a, C.cap.topText, cx, cy, S * 0.062, 'rgba(190,200,210,0.42)',
      { align: 'center', track: S * 0.028, weight: 600, maxWidth: S * 0.62 });
    a.save();
    a.strokeStyle = C.cap.topRing; a.lineWidth = S * 0.004;
    a.beginPath(); a.arc(cx, cy, S * 0.300, 0, Math.PI * 2); a.stroke();
    a.restore();
    tooth(a, S, S, rnd, 5);
    const rw = S >> 1;
    const rough = mk(rw, rw); const r = rough.getContext('2d');
    r.fillStyle = 'rgb(150,150,150)'; r.fillRect(0, 0, rw, rw);
    tooth(r, rw, rw, mulberry32(0x6565), 18);
    const height = mk(rw, rw); const hc = height.getContext('2d');
    hc.fillStyle = 'rgb(120,120,120)'; hc.fillRect(0, 0, rw, rw);
    hc.save(); hc.scale(rw / S, rw / S);
    text(hc, C.cap.topText, cx, cy, S * 0.062, 'rgb(76,76,76)',
      { align: 'center', track: S * 0.028, weight: 600, maxWidth: S * 0.62 });
    hc.restore();
    tooth(hc, rw, rw, mulberry32(0x7676), 16);
    return { albedo, roughness: rough, height, normal: heightToNormal(height, 1.5),
             material: { envMapIntensity: 0.85, clearcoat: 0.30, clearcoatRoughness: 0.30 } };
  };

  /**
   * The base print.
   *
   * Optional, and only exists when there is artwork for it, because most jars
   * have nothing on the bottom and an invented base sticker would be a claim
   * about a real product. A pack without `art.bottom` returns null and the jar
   * factory skips the mesh entirely.
   *
   * Square like the cap top, not a wrap: a base label is a disc read face on,
   * so it has no seam and no circumference to divide.
   */
  const bottom = C.art?.bottom
    ? (S = 1024) => artWrap(C.art.bottom, S, 1, C)
    : null;

  return { name: C.name, body, skirt, top, bottom };
}
