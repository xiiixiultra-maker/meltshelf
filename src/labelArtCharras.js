/**
 * CHARRAS — chrome diamond plate with an embossed logo.
 *
 * Oishii x Gary Payton, 90u Live Rosin.
 *
 * Built at the TRUE wrap aspects (7.194 body, 10.224 skirt) rather than the
 * 7.96 / 11.1 the older drawn jars use, because a tread plate is a geometric
 * pattern and a 10% vertical stretch turns every diamond into a parallelogram.
 * See WRAP in labelArtTemplate.js for where those numbers come from.
 *
 * HOW THE CHROME IS MADE
 *
 * Almost none of this is in the albedo. Chrome is a mirror: its colour is
 * whatever it reflects, so the albedo is a near-flat light grey and the work is
 * done by three other maps.
 *
 *   normal      the plate. Raised lozenges catch and break the reflection,
 *               which is the entire read. Painting the pattern into the albedo
 *               instead gives you a photo of diamond plate printed on a flat
 *               sticker, which looks exactly as dead as it sounds.
 *   metalness    1.0 on the plate, near 0 under the logo. Paint on chrome is
 *               still paint.
 *   roughness   low on the plate, higher on the lozenge faces so the highlight
 *               travels rather than smearing.
 *
 * THE LOGO IS EMBOSSED, NOT PRINTED. It rides in the height map as well as the
 * albedo, so it has a lit edge and a shadowed one and sits in the metal rather
 * than on it.
 *
 * The logo arrives as an ALREADY LOADED bitmap. Image decode is async and the
 * label builders are not; handing over a still-loading <img> silently yields a
 * blank wrap.
 */
import { mulberry32, heightToNormal } from './labelTextures.js';

export const CHARRAS = {
  green: '#51EC43',          // sampled from the supplied artwork
  neon: '#5BFF39',           // the colourway plate, hotter than the ink green
  neonLow: '#2FA820',
  orange: '#FF7A18',
  greenDeep: '#1F7A19',
  greenLift: '#8DFF7F',
  chrome: '#EDF1F5',
  chromeLow: '#C6CCD2',
  ink: '#0C0F0C',
};

const WRAP = { body: 7.194, skirt: 10.224 };

/**
 * World span of each wrap, in millimetres up the jar.
 *
 *   body   LABEL_BODY_Y 1.60  ..  + LABEL_BODY_H 21.80   =  1.60 .. 23.40
 *   seam   the ledge, 0.35mm of bare glass
 *   skirt  Y_SEAM 23.65 + 0.1  ..  + LABEL_SKIRT_H 15.40 = 23.75 .. 39.15
 *
 * The logo is authored in these coordinates, not per-canvas, so the same mark
 * can be drawn onto BOTH wraps and meet across the join. Author it as a
 * fraction of either canvas and the halves land at different heights and the
 * mark tears even when the jar is shut.
 *
 * Both wraps carry rotation.y = Math.PI, so a feature at fraction f on one sits
 * at fraction f on the other. No half-turn offset is needed.
 *
 * Canvas y = 0 is the TOP of a wrap: three flips textures by default, so v = 1
 * (cylinder top) samples the first row of the canvas.
 */
const SPAN = {
  body:  { lo: 1.60,  hi: 23.40 },
  skirt: { lo: 23.75, hi: 39.15 },
};

/**
 * Draw a bitmap positioned in WORLD millimetres, so it can straddle the seam.
 * Anything outside the canvas simply clips, which is how each wrap ends up with
 * its own half of the mark.
 */
function placeWorld(ctx, img, W, H, span, cxFrac, worldCY, worldH, tint) {
  const mmPerPx = (span.hi - span.lo) / H;
  const dh = worldH / mmPerPx;
  const dw = dh * (img.width / img.height);
  const cy = (span.hi - worldCY) / mmPerPx;      // world up -> canvas down
  const x = W * cxFrac - dw / 2, y = cy - dh / 2;
  if (!tint) { ctx.drawImage(img, x, y, dw, dh); return; }
  const t = mk(Math.max(1, Math.ceil(dw)), Math.max(1, Math.ceil(dh)));
  const tc = t.getContext('2d');
  tc.drawImage(img, 0, 0, t.width, t.height);
  tc.globalCompositeOperation = 'source-in';
  tc.fillStyle = tint;
  tc.fillRect(0, 0, t.width, t.height);
  ctx.drawImage(t, x, y, dw, dh);
}

/**
 * A banner behind the copy, so type reads against polished plate.
 *
 * Soft on all four edges. A hard-edged band round a mirrored jar reads as a
 * belt of tape; this fades vertically into the plate and falls off horizontally
 * away from the front, so it is a pool of shade rather than a shape.
 */
function banner(ctx, W, H, y0, h, opacity = 0.72) {
  const band = mk(W, Math.ceil(h));
  const b = band.getContext('2d');
  const v = b.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0.00, 'rgba(6,10,6,0)');
  v.addColorStop(0.22, `rgba(6,10,6,${opacity})`);
  v.addColorStop(0.78, `rgba(6,10,6,${opacity})`);
  v.addColorStop(1.00, 'rgba(6,10,6,0)');
  b.fillStyle = v; b.fillRect(0, 0, W, h);
  // horizontal falloff away from the front face
  b.globalCompositeOperation = 'destination-in';
  const hgrad = b.createLinearGradient(0, 0, W, 0);
  hgrad.addColorStop(0.00, 'rgba(0,0,0,0.10)');
  hgrad.addColorStop(0.22, 'rgba(0,0,0,0.55)');
  hgrad.addColorStop(0.50, 'rgba(0,0,0,1)');
  hgrad.addColorStop(0.78, 'rgba(0,0,0,0.55)');
  hgrad.addColorStop(1.00, 'rgba(0,0,0,0.10)');
  b.fillStyle = hgrad; b.fillRect(0, 0, W, h);
  ctx.drawImage(band, 0, y0);
}

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function tooth(ctx, w, h, rnd, amount = 5) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Tread plate.
 *
 * Real diamond plate is not a lattice of diamonds. It is PAIRS of raised
 * lozenges, and each pair sits at ninety degrees to its neighbours. The
 * diamond you think you see is the negative space between four pairs. Drawing
 * actual diamonds is the usual mistake and it reads as a quilt.
 *
 * `cells` counts across the full circumference, so the pattern meets itself at
 * the seam with no join.
 */
function plate(ctx, W, H, cells, mode, tint) {
  const s = W / cells;                       // integral divisor: seam matches
  const rows = Math.max(1, Math.round(H / s));
  const sh = H / rows;

  // Roughness sits very low. Diamond plate is polished steel: at 0.08 the field
  // mirrors, while the lozenge faces at 0.18 break the highlight up.
  // A tinted plate is still metal: only the albedo changes, so the normal and
  // roughness keep doing the work and it reads as anodised rather than painted.
  const bg = mode === 'height' ? 'rgb(86,86,86)'
    : mode === 'rough' ? 'rgb(20,20,20)'
    : (tint ? tint.low : CHARRAS.chromeLow);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const lozenge = (cx, cy, len, wide, ang) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.beginPath();
    // a stadium: two flat sides, rounded ends. Not an ellipse, not a rhombus.
    const r = wide / 2, half = len / 2 - r;
    ctx.moveTo(-half, -r);
    ctx.lineTo(half, -r);
    ctx.arc(half, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-half, r);
    ctx.arc(-half, 0, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();

    if (mode === 'height') {
      // bright = proud. A soft gradient across the short axis gives the bar a
      // crown, so the normal bends rather than stepping.
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0.00, 'rgb(120,120,120)');
      g.addColorStop(0.42, 'rgb(228,228,228)');
      g.addColorStop(0.62, 'rgb(214,214,214)');
      g.addColorStop(1.00, 'rgb(110,110,110)');
      ctx.fillStyle = g;
    } else if (mode === 'rough') {
      ctx.fillStyle = 'rgb(46,46,46)';       // faces scuff more than the field
    } else {
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0.00, tint ? tint.low : '#AEB5BD');
      g.addColorStop(0.38, tint ? tint.hi : '#FBFDFF');
      g.addColorStop(1.00, tint ? tint.low : '#9BA2AA');
      ctx.fillStyle = g;
    }
    ctx.fill();
    ctx.restore();
  };

  const len = s * 0.66, wide = s * 0.175, gap = s * 0.26;
  for (let j = -1; j <= rows; j++) {
    for (let i = 0; i < cells; i++) {
      const cx = (i + 0.5) * s, cy = (j + 0.5) * sh;
      const ang = ((i + j) % 2 === 0 ? 1 : -1) * Math.PI / 4;
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      lozenge(cx - nx * gap / 2, cy - ny * gap / 2, len, wide, ang);
      lozenge(cx + nx * gap / 2, cy + ny * gap / 2, len, wide, ang);
    }
  }
}

/**
 * Draw a loaded bitmap centred on the wrap, sized by HEIGHT.
 *
 * Height, not width, because the wrap is 7.19 times wider than it is tall and
 * height is the scarce axis. Sizing the Charras mark to 0.325 of the WIDTH
 * made it 1.1x taller than the entire label, which is how it ended up spilling
 * over the strain line. A height fraction is impossible to get that wrong.
 */
function place(ctx, img, W, H, cxFrac, cyFrac, heightFrac, tint) {
  const dh = H * heightFrac, dw = dh * (img.width / img.height);
  const x = W * cxFrac - dw / 2, y = H * cyFrac - dh / 2;
  if (!tint) { ctx.drawImage(img, x, y, dw, dh); return { x, y, dw, dh }; }
  // tint through the alpha: draw the art, then paint over it clipped to itself
  const t = mk(Math.ceil(dw), Math.ceil(dh));
  const tc = t.getContext('2d');
  tc.drawImage(img, 0, 0, t.width, t.height);
  tc.globalCompositeOperation = 'source-in';
  tc.fillStyle = tint;
  tc.fillRect(0, 0, t.width, t.height);
  ctx.drawImage(t, x, y, dw, dh);
  return { x, y, dw, dh };
}

function text(ctx, str, cx, y, size, color, track, weight = 600) {
  ctx.save();
  ctx.font = `${weight} ${size}px 'Archivo','Helvetica Neue',Arial,sans-serif`;
  ctx.textBaseline = 'middle';
  const chars = str.split('');
  const w = chars.map((c) => ctx.measureText(c).width + track);
  const total = w.reduce((a, b) => a + b, 0) - track;
  let x = cx - total / 2;
  ctx.fillStyle = color;
  for (let i = 0; i < chars.length; i++) { ctx.fillText(chars[i], x + w[i] / 2 - w[i] / 2, y); x += w[i]; }
  ctx.restore();
  return total;
}

/**
 * The mark, in world millimetres. Centred just ABOVE the seam at 23.575 so a
 * little more of it rides on the cap: when the cap turns, the split reads as
 * the top pulling away from the bottom rather than a line appearing.
 */
const LOGO = { cy: 24.60, h: 15.0 };

const COPY = {
  strainA: 'OISHII',
  strainX: 'x',
  strainB: 'GARY PAYTON',
  spec: '90u  ·  LIVE ROSIN',
};

/**
 * Colourways. The geometry, the plate and the emboss are identical; a colourway
 * changes the metal tint, the ink, and the strain line. That is the same idea
 * as a label pack one level down: swap the paint, keep the mould.
 */
export const COLOURWAY = {
  chrome: { plate: null, ink: CHARRAS.green, glow: 'rgba(81,236,67,.30)' },
  neon: {
    plate: { low: CHARRAS.neonLow, hi: CHARRAS.neon },
    ink: CHARRAS.orange,
    glow: 'rgba(255,122,24,.32)',
  },
};

export function makeCharrasPack({
  logo, meltshelfLogo = null,
  colourway = 'chrome',
  copy = COPY,
} = {}) {
  const CELLS = 26;                    // divides the circumference cleanly
  const CW = COLOURWAY[colourway] ?? COLOURWAY.chrome;

  const body = (W = 2048) => {
    const H = Math.round(W / WRAP.body);
    const rnd = mulberry32(0xC4A44);

    // ---- albedo: chrome field, green logo, green type --------------------
    const albedo = mk(W, H); const a = albedo.getContext('2d');
    plate(a, W, H, CELLS, 'albedo', CW.plate);
    // a broad sheen so the plate is not evenly lit before it even reflects
    const sg = a.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0.00, 'rgba(255,255,255,0.26)');
    sg.addColorStop(0.44, 'rgba(255,255,255,0.04)');
    sg.addColorStop(1.00, 'rgba(0,0,0,0.16)');
    a.fillStyle = sg; a.fillRect(0, 0, W, H);

    if (logo) placeWorld(a, logo, W, H, SPAN.body, 0.5, LOGO.cy, LOGO.h, CW.ink);
    banner(a, W, H, H * 0.560, H * 0.400);
    text(a, `${copy.strainA}  ${copy.strainX}  ${copy.strainB}`, W * 0.5, H * 0.690, H * 0.104, CW.ink, H * 0.030, 700);
    text(a, copy.spec, W * 0.5, H * 0.820, H * 0.068, 'rgba(238,255,235,0.92)', H * 0.054, 500);
    tooth(a, W, H, rnd, 5);

    // ---- height: plate, with the logo standing proud of it ---------------
    const rw = W >> 1, rh = H >> 1;
    const height = mk(rw, rh); const hc = height.getContext('2d');
    hc.save(); hc.scale(rw / W, rh / H);
    plate(hc, W, H, CELLS, 'height', CW.plate);
    if (logo) placeWorld(hc, logo, W, H, SPAN.body, 0.5, LOGO.cy, LOGO.h, 'rgb(255,255,255)');
    text(hc, `${copy.strainA}  ${copy.strainX}  ${copy.strainB}`, W * 0.5, H * 0.690, H * 0.104, 'rgb(226,226,226)', H * 0.030, 700);
    hc.restore();

    // ---- roughness -------------------------------------------------------
    const rough = mk(rw, rh); const r = rough.getContext('2d');
    r.save(); r.scale(rw / W, rh / H);
    plate(r, W, H, CELLS, 'rough', CW.plate);
    if (logo) placeWorld(r, logo, W, H, SPAN.body, 0.5, LOGO.cy, LOGO.h, 'rgb(150,150,150)');   // paint is duller
    text(r, `${copy.strainA}  ${copy.strainX}  ${copy.strainB}`, W * 0.5, H * 0.690, H * 0.104, 'rgb(150,150,150)', H * 0.030, 700);
    r.restore();
    tooth(r, rw, rh, mulberry32(0x2C2C), 12);

    // ---- metalness: chrome everywhere except the paint -------------------
    const metal = mk(rw, rh); const m = metal.getContext('2d');
    m.fillStyle = 'rgb(255,255,255)'; m.fillRect(0, 0, rw, rh);
    m.save(); m.scale(rw / W, rh / H);
    if (logo) placeWorld(m, logo, W, H, SPAN.body, 0.5, LOGO.cy, LOGO.h, 'rgb(26,26,26)');
    text(m, `${copy.strainA}  ${copy.strainX}  ${copy.strainB}`, W * 0.5, H * 0.690, H * 0.104, 'rgb(26,26,26)', H * 0.030, 700);
    text(m, copy.spec, W * 0.5, H * 0.820, H * 0.068, 'rgb(40,40,40)', H * 0.046, 500);
    m.restore();

    return {
      albedo, roughness: rough, height, metalness: metal,
      normal: heightToNormal(height, 2.6),      // hard, so the plate reads
      material: { envMapIntensity: 2.7, clearcoat: 0.20, clearcoatRoughness: 0.10 },
    };
  };

  const skirt = (W = 2048) => {
    const H = Math.round(W / WRAP.skirt);
    const rnd = mulberry32(0xC4A55);
    const albedo = mk(W, H); const a = albedo.getContext('2d');
    plate(a, W, H, CELLS, 'albedo', CW.plate);
    const sg = a.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0.00, 'rgba(255,255,255,0.30)');
    sg.addColorStop(0.46, 'rgba(255,255,255,0.03)');
    sg.addColorStop(1.00, 'rgba(0,0,0,0.20)');
    a.fillStyle = sg; a.fillRect(0, 0, W, H);
    // the upper half of the mark. Same world position as the body draws, so the
    // two halves are one logo while the cap is seated and tear apart the moment
    // it turns.
    if (logo) placeWorld(a, logo, W, H, SPAN.skirt, 0.5, LOGO.cy, LOGO.h, CW.ink);
    tooth(a, W, H, rnd, 5);

    const rw = W >> 1, rh = H >> 1;
    const height = mk(rw, rh); const hc = height.getContext('2d');
    hc.save(); hc.scale(rw / W, rh / H);
    plate(hc, W, H, CELLS, 'height', CW.plate);
    if (logo) placeWorld(hc, logo, W, H, SPAN.skirt, 0.5, LOGO.cy, LOGO.h, 'rgb(255,255,255)');
    hc.restore();
    const rough = mk(rw, rh); const r = rough.getContext('2d');
    r.save(); r.scale(rw / W, rh / H);
    plate(r, W, H, CELLS, 'rough', CW.plate);
    if (logo) placeWorld(r, logo, W, H, SPAN.skirt, 0.5, LOGO.cy, LOGO.h, 'rgb(150,150,150)');
    r.restore();
    tooth(r, rw, rh, mulberry32(0x3D3D), 12);
    const metal = mk(rw, rh); const m = metal.getContext('2d');
    m.fillStyle = 'rgb(255,255,255)'; m.fillRect(0, 0, rw, rh);
    m.save(); m.scale(rw / W, rh / H);
    if (logo) placeWorld(m, logo, W, H, SPAN.skirt, 0.5, LOGO.cy, LOGO.h, 'rgb(26,26,26)');
    m.restore();

    return {
      albedo, roughness: rough, height, metalness: metal,
      normal: heightToNormal(height, 2.6),
      material: { envMapIntensity: 2.7, clearcoat: 0.20, clearcoatRoughness: 0.10 },
    };
  };

  const top = (S = 1024) => {
    const rnd = mulberry32(0xC4A66);
    const albedo = mk(S, S); const a = albedo.getContext('2d');
    plate(a, S, S, 13, 'albedo', CW.plate);
    const vig = a.createRadialGradient(S / 2, S * 0.40, S * 0.05, S / 2, S / 2, S * 0.58);
    vig.addColorStop(0.0, 'rgba(255,255,255,0.22)');
    vig.addColorStop(1.0, 'rgba(0,0,0,0.46)');
    a.fillStyle = vig; a.fillRect(0, 0, S, S);

    // MELTSHELF, same green, clean. A plate this busy needs the mark to sit on
    // a calm field, so the lozenges are knocked back behind it.
    a.save();
    // A hard-edged ellipse reads as a sticker stuck on the plate. A radial
    // falloff knocks the lozenges back without drawing a shape of its own.
    const knock = a.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.36);
    knock.addColorStop(0.00, 'rgba(8,12,8,0.72)');
    knock.addColorStop(0.55, 'rgba(8,12,8,0.52)');
    knock.addColorStop(1.00, 'rgba(8,12,8,0)');
    a.save(); a.scale(1, 0.36); a.translate(0, S * 0.5 / 0.36 - S * 0.5);
    a.fillStyle = knock; a.fillRect(0, 0, S, S * 2);
    a.restore();
    a.restore();

    if (meltshelfLogo) {
      place(a, meltshelfLogo, S, S, 0.5, 0.5, 0.16, CW.ink);
    } else {
      text(a, 'MELTSHELF', S / 2, S / 2, S * 0.088, CW.ink, S * 0.038, 700);
    }
    a.save();
    a.strokeStyle = CW.glow; a.lineWidth = S * 0.005;
    a.beginPath(); a.arc(S / 2, S / 2, S * 0.392, 0, Math.PI * 2); a.stroke();
    a.restore();
    tooth(a, S, S, rnd, 5);

    const rw = S >> 1;
    const height = mk(rw, rw); const hc = height.getContext('2d');
    hc.save(); hc.scale(rw / S, rw / S);
    plate(hc, S, S, 13, 'height', CW.plate);
    hc.fillStyle = 'rgb(80,80,80)';
    hc.beginPath(); hc.ellipse(S / 2, S / 2, S * 0.335, S * 0.115, 0, 0, Math.PI * 2); hc.fill();
    text(hc, 'MELTSHELF', S / 2, S / 2, S * 0.088, 'rgb(214,214,214)', S * 0.038, 700);
    hc.restore();

    const rough = mk(rw, rw); const r = rough.getContext('2d');
    r.save(); r.scale(rw / S, rw / S); plate(r, S, S, 13, 'rough', CW.plate);
    r.fillStyle = 'rgb(150,150,150)';
    r.beginPath(); r.ellipse(S / 2, S / 2, S * 0.335, S * 0.115, 0, 0, Math.PI * 2); r.fill();
    r.restore();
    tooth(r, rw, rw, mulberry32(0x4E4E), 12);

    const metal = mk(rw, rw); const m = metal.getContext('2d');
    m.fillStyle = 'rgb(255,255,255)'; m.fillRect(0, 0, rw, rw);
    m.save(); m.scale(rw / S, rw / S);
    m.fillStyle = 'rgb(40,40,40)';
    m.beginPath(); m.ellipse(S / 2, S / 2, S * 0.335, S * 0.115, 0, 0, Math.PI * 2); m.fill();
    m.restore();

    return {
      albedo, roughness: rough, height, metalness: metal,
      normal: heightToNormal(height, 2.4),
      material: { envMapIntensity: 2.7, clearcoat: 0.20, clearcoatRoughness: 0.10 },
    };
  };

  return { name: `Charras — ${copy.strainA} x ${copy.strainB}`, body, skirt, top };
}
