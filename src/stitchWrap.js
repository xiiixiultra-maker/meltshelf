/**
 * stitchWrap.js — turn N photographs of a jar into one label wrap.
 *
 * THE PROBLEM
 * A jar is a cylinder. A photograph of a cylinder is not a picture of its
 * label: the label is wrapped away from the lens, so the middle of the frame
 * is close to true and the edges are squashed almost to nothing. Pasting six
 * photos side by side gives six squashed edges meeting in the middle of the
 * artwork, which is why a naive strip-join always looks like a folded map.
 *
 * THE GEOMETRY
 * Take the jar's silhouette in the photo, width 2R centred at cx. A point on
 * the surface at angle t from the facing centre lands at
 *
 *     x = cx + R sin t
 *
 * so unwrapping is just running that backwards: for each column of output we
 * want at angle t, read the source at cx + R sin t. Because the mapping is
 * sin, the source columns bunch up toward the edges, and the WIDTH of source
 * that a single output column represents is its derivative,
 *
 *     dx/dt = R cos t
 *
 * Sampling that width per column, rather than one pixel, is what keeps the
 * edges of each shot as sharp as the middle. It is area sampling, and it is
 * the whole difference between this reading as a label and reading as a smear.
 *
 * WHY ONLY THE MIDDLE OF EACH PHOTO IS USED
 * Near the silhouette edge, cos t goes to zero: an entire quadrant of jar is
 * crushed into a few pixels and no amount of arithmetic puts detail back. So
 * each shot contributes only the arc it photographed well, 360/N degrees plus
 * a small overlap, and the overlap is cross-faded so exposure differences
 * between shots break up instead of landing as a hard vertical line.
 *
 * WHAT THIS IS NOT
 * It is not photogrammetry and it does not solve for camera pose. It assumes
 * the jar is upright, roughly centred in the guide, and turned by an even
 * fraction of a turn between shots. That is a fair assumption because the
 * capture flow ASKS for exactly that, and it is why the guide box exists.
 */

/** Default number of shots around the jar. Six is 60 degrees each, which is
 *  the most a phone camera holds sharply without the edges going to mush. */
export const TURNS = 6;

/** How much extra arc each shot contributes, as a fraction of its share, to
 *  give the cross-fade something to work with. 0.14 of 60 degrees is about
 *  4 degrees of overlap on each side. */
const OVERLAP = 0.14;

/** Gain is clamped so exposure matching evens out the lighting without
 *  flattening a jar that genuinely is darker down one side. */
const GAIN_LIMIT = { lo: 0.82, hi: 1.24 };

const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

/**
 * Unwrap the arc one photo shows into a flat strip.
 *
 * @param {CanvasImageSource} src   the photo
 * @param {{x,y,w,h}} rect          the jar's silhouette within the photo
 * @param {number} arc              arc to recover, radians
 * @param {number} outW             strip width in pixels
 * @param {number} outH             strip height in pixels
 */
export function unwrapStrip(src, rect, arc, outW, outH) {
  const strip = mk(outW, outH);
  const g = strip.getContext('2d');
  const R = rect.w / 2;
  const cx = rect.x + R;
  const dt = arc / outW;

  for (let j = 0; j < outW; j++) {
    const t = ((j + 0.5) / outW - 0.5) * arc;
    const sx = cx + R * Math.sin(t);
    // The source width this column stands for. Never below one pixel, or the
    // near-edge columns sample nothing and stripe.
    const sw = Math.max(1, R * Math.cos(t) * dt);
    // +1 on the destination width: adjacent columns must overlap by a hair or
    // sub-pixel rounding leaves transparent seams between them.
    g.drawImage(src, sx - sw / 2, rect.y, sw, rect.h, j, 0, 1.02, outH);
  }
  return strip;
}

/**
 * Flatten the left-to-right shading across one strip.
 *
 * A cylinder lit from anywhere is brighter facing the light and falls away
 * toward both silhouettes, and unwrapping does not remove that: it stretches
 * it flat, so every strip arrives with a bright middle and dim edges. Joined
 * up, six of those read as six spotlights down the label.
 *
 * The correction is a flat field measured FROM THE IMAGE, not assumed from a
 * lighting model. Take the mean luminance of each column, smooth it hard
 * enough that only the broad falloff survives, and divide it out. Because the
 * smoothing window is a large fraction of the strip, real content, an edge, a
 * letter, a colour block, is far too narrow to register and is left alone.
 *
 * Deliberately partial: STRENGTH below 1 keeps some of the original modelling,
 * because a label with every trace of shading removed stops looking like a
 * photograph of a cylinder and starts looking like a flat scan.
 */
const DESHADE = { strength: 0.82, window: 0.22, clamp: { lo: 0.6, hi: 1.7 } };

function deshadeStrip(cv) {
  const g = cv.getContext('2d', { willReadFrequently: true });
  const W = cv.width, H = cv.height;
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;

  // column means, on a vertical stride: this is a broad profile, not detail
  const col = new Float32Array(W);
  const stride = Math.max(1, H >> 6);
  for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let y = 0; y < H; y += stride) {
      const i = (y * W + x) * 4;
      s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      n++;
    }
    col[x] = n ? s / n : 0;
  }

  // box-smooth the profile, clamping at the edges rather than wrapping: the
  // two ends of a strip are different parts of the jar and must not average
  // into each other.
  const half = Math.max(2, Math.round(W * DESHADE.window / 2));
  const smooth = new Float32Array(W);
  let run = 0;
  for (let x = -half; x <= half; x++) run += col[Math.min(W - 1, Math.max(0, x))];
  const win = half * 2 + 1;
  for (let x = 0; x < W; x++) {
    smooth[x] = run / win;
    run += col[Math.min(W - 1, x + half + 1)] - col[Math.max(0, x - half)];
  }

  let mean = 0;
  for (let x = 0; x < W; x++) mean += smooth[x];
  mean /= W;
  if (mean < 1) return;                       // a black strip has nothing to flatten

  const gain = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const g0 = smooth[x] > 1 ? mean / smooth[x] : 1;
    const g1 = 1 + (g0 - 1) * DESHADE.strength;
    gain[x] = Math.min(DESHADE.clamp.hi, Math.max(DESHADE.clamp.lo, g1));
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, k = gain[x];
      d[i] = Math.min(255, d[i] * k);
      d[i + 1] = Math.min(255, d[i + 1] * k);
      d[i + 2] = Math.min(255, d[i + 2] * k);
    }
  }
  g.putImageData(img, 0, 0);
}

/** Mean luminance of a canvas, sampled on a grid rather than every pixel. */
function meanLuma(cv, step = 4) {
  const g = cv.getContext('2d', { willReadFrequently: true });
  const { data } = g.getImageData(0, 0, cv.width, cv.height);
  let sum = 0, n = 0;
  for (let i = 0; i < data.length; i += 4 * step) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n++;
  }
  return n ? sum / n : 0;
}

/** Scale a canvas's brightness in place. */
function applyGain(cv, gain) {
  if (Math.abs(gain - 1) < 0.005) return;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const img = g.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  // A 256-entry table beats a multiply and clamp per subpixel.
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = v * gain;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]];
  }
  g.putImageData(img, 0, 0);
}

/**
 * Stitch N shots into one wrap.
 *
 * @param {Array<{src: CanvasImageSource, rect: {x,y,w,h}}>} shots
 *        In the order they were taken, turning consistently one way.
 * @param {{width?: number, aspect?: number, match?: boolean}} opts
 * @returns {HTMLCanvasElement} the wrap, `width` by `width / aspect`
 */
export function stitchWrap(shots, opts = {}) {
  const { width = 4096, aspect = 7.194, match = true, deshade = true } = opts;
  if (!shots?.length) throw new Error('stitchWrap: no shots');

  const N = shots.length;
  const H = Math.round(width / aspect);
  const share = width / N;                       // columns per shot, no overlap
  const bleed = Math.round(share * OVERLAP);     // extra columns on each side
  const stripW = Math.round(share) + bleed * 2;
  const arc = (2 * Math.PI / N) * (1 + 2 * OVERLAP);

  const strips = shots.map((s) => unwrapStrip(s.src, s.rect, arc, stripW, H));

  // Order matters. Flatten each strip's own falloff FIRST, then match strips
  // to each other. Reversed, the matching would be computed from means that
  // still carry the shading and would be measuring the wrong thing.
  if (deshade) strips.forEach(deshadeStrip);

  // Even the shots out against each other before they are laid down, so the
  // cross-fade only has to hide what is left.
  if (match && N > 1) {
    const lumas = strips.map((s) => meanLuma(s));
    const target = lumas.slice().sort((a, b) => a - b)[N >> 1];   // median
    strips.forEach((s, i) => {
      if (lumas[i] < 1) return;
      const g = Math.min(GAIN_LIMIT.hi, Math.max(GAIN_LIMIT.lo, target / lumas[i]));
      applyGain(s, g);
    });
  }

  /* ---- composite by weighted accumulation, NOT by alpha cross-fade ----
     The obvious way to join overlapping strips is to feather both edges and
     draw them over each other. It leaves a dark band down every seam, and the
     reason is compositing arithmetic rather than anything about the images.

     Source-over of B at alpha b onto A at alpha a gives

         b*B + a*(1 - b)*A

     so at the middle of a linear cross-fade, a = b = 0.5, the total weight is
     0.5 + 0.25 = 0.75. A quarter of the light is simply missing, and against
     the empty canvas that reads as a shadow at every join. It is not subtle:
     it measured 15/255 on a flat grey test card, six times over.

     Accumulating colour*weight and dividing by the summed weight cannot do
     that. The weights always add to exactly what was contributed, so a seam
     is the average of two views of the same piece of jar, which is what a
     seam should be. */
  // Sized for the whole image, not one row. A typed array drops out-of-range
  // writes silently, so getting this wrong produced a single correct scanline
  // and an otherwise black wrap, with no error anywhere.
  const acc = new Float32Array(width * H * 3);
  const wsum = new Float32Array(width);      // weight is per COLUMN, not per pixel
  const ramp = Math.max(1, bleed * 2);

  for (let i = 0; i < N; i++) {
    const x0 = Math.round(i * share) - bleed;
    const sd = strips[i].getContext('2d', { willReadFrequently: true })
      .getImageData(0, 0, stripW, H).data;

    for (let lx = 0; lx < stripW; lx++) {
      // Trapezoid: up over the leading bleed, flat, down over the trailing one.
      const w = Math.min(1, lx / ramp) * Math.min(1, (stripW - lx) / ramp);
      if (w <= 0) continue;
      // The wrap is a loop, so a column hanging off either end belongs at the
      // other. Without this the join between the last shot and the first is
      // the one seam that never gets averaged.
      const ox = ((x0 + lx) % width + width) % width;
      wsum[ox] += w;
      for (let y = 0; y < H; y++) {
        const si = (y * stripW + lx) * 4;
        const ai = (y * width + ox) * 3;
        acc[ai] += sd[si] * w;
        acc[ai + 1] += sd[si + 1] * w;
        acc[ai + 2] += sd[si + 2] * w;
      }
    }
  }

  // Normalise. Colour and weight were accumulated in the same loop under the
  // same condition, so they cannot disagree about which columns contributed.
  const outImg = new ImageData(width, H);
  const od = outImg.data;
  for (let x = 0; x < width; x++) {
    const inv = wsum[x] > 0 ? 1 / wsum[x] : 0;
    for (let y = 0; y < H; y++) {
      const ai = (y * width + x) * 3, di = (y * width + x) * 4;
      od[di] = acc[ai] * inv;
      od[di + 1] = acc[ai + 1] * inv;
      od[di + 2] = acc[ai + 2] * inv;
      od[di + 3] = 255;
    }
  }

  const out = mk(width, H);
  out.getContext('2d').putImageData(outImg, 0, 0);
  return out;
}

/* =====================================================================
   SPLITTING ONE PHOTOGRAPH ACROSS A JAR THAT COMES APART

   A printed label runs over the whole jar and is CUT by the seam, so it
   splits when you unscrew the lid. The Resin Culture and Charras jars are
   built that way and it is the thing that makes a jar read as a real object
   rather than a decal.

   The renderer wants that as two textures, because the cap and the body are
   two meshes that move independently. So a full-jar photograph has to be cut
   at exactly the height the glass is cut at.

   The numbers are the jar's, not a guess:

     H_TOTAL   42.00   the whole jar
     seam      23.65   where the cap parts from the body
     body      1.60 to 23.40   printed band below the seam
     skirt    23.75 to 39.15   printed band above it

   Which leaves 1.6mm of bare black glass at the heel and 2.85mm at the crown,
   because that is how these jars are actually printed: the label does not run
   to the edges.

   THE BUG THIS REPLACES: capture asked stitchWrap for a wrap at BODY aspect,
   7.194:1, which is the proportion of the band BELOW the seam. But the guide
   box being photographed was the whole jar. So 42mm of jar was squashed into
   21.8mm of band, the label sat compressed into the bottom half, and the cap
   fell back to the template's own drawn art complete with its grip ribs.
   ===================================================================== */
export const JAR = {
  H_TOTAL: 42.0,
  body:  { lo: 1.60,  hi: 23.40, aspect: 7.194 },
  skirt: { lo: 23.75, hi: 39.15, aspect: 10.224 },
};

/** Circumference over height. What a photograph of a whole jar unwraps to. */
export const FULL_ASPECT = (2 * Math.PI * 25.0) / JAR.H_TOTAL;   // 3.74

/**
 * Cut a full-jar wrap into the two bands the renderer needs.
 *
 * @param {CanvasImageSource & {width:number, height:number}} full
 *        A wrap of the ENTIRE jar, top edge at the crown, bottom at the heel.
 */
export function splitJarWrap(full) {
  const H = JAR.H_TOTAL;
  // Millimetres from the heel become rows from the TOP of the image.
  const band = (b) => {
    const vTop = (H - b.hi) / H;
    const vBot = (H - b.lo) / H;
    const sy = Math.round(vTop * full.height);
    const sh = Math.max(1, Math.round((vBot - vTop) * full.height));
    const out = mk(full.width, Math.max(1, Math.round(full.width / b.aspect)));
    // Source and destination are already the same proportion, so this is a
    // resample, not a stretch. If it ever stretches, one of the constants
    // above has drifted from the model.
    out.getContext('2d').drawImage(full, 0, sy, full.width, sh,
                                   0, 0, out.width, out.height);
    return out;
  };
  return { body: band(JAR.body), skirt: band(JAR.skirt) };
}

/**
 * The guide the capture screen draws, and the rect the stitcher expects, are
 * the same rectangle in two coordinate systems. Keeping the conversion here
 * means the two can never drift apart.
 *
 * @param {{w: number, h: number}} frame   the captured image, in pixels
 * @param {{cx, cy, w, h}} guide           guide box in 0..1 of the frame
 */
export function guideToRect(frame, guide) {
  const w = guide.w * frame.w;
  const h = guide.h * frame.h;
  return { x: guide.cx * frame.w - w / 2, y: guide.cy * frame.h - h / 2, w, h };
}

/** The jar is wider than it is tall: 50mm across, 42mm standing. The guide has
 *  to match or the unwrap inherits whatever the guide got wrong. */
export const JAR_ASPECT = 50 / 42;
