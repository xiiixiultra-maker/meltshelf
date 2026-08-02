/**
 * createSleeveJarModel.js — the squat sleeve jar (9Bottles type).
 *
 * The second jar the industry actually uses, and it is not the first one
 * rescaled. Measured off thirteen reference photographs at H/D 0.65 against
 * the Resin Culture jar's 0.839, which is the difference between a jar that
 * stands and a jar that sits.
 *
 * WHAT MAKES IT THIS JAR RATHER THAN A CYLINDER
 * Three materials meet on one silhouette, and each has to behave differently
 * or the whole thing reads as plastic:
 *
 *   wood    turned hardwood cap, matte, grain running around the wall
 *   paper   a printed sleeve WRAPPED round the glass, not printed on it
 *   glass   near-black, glossy, with a hard specular rim
 *
 * THE SLEEVE IS THE POINT
 * It is a sheet wrapped to a cylinder and overlapped, so it has thickness,
 * two free edges, and exactly one vertical crease where the trailing edge
 * lies over the leading edge. That crease is what you see on the real jar and
 * it is geometry here, not a line drawn into the artwork: it catches light on
 * one side and drops a hairline shadow on the other, which a painted line
 * cannot do at any angle.
 *
 * The sleeve spans the cap/jar seam on the real product, the way a tamper
 * band does. A single ring spanning the seam could never open, so it is built
 * as two rings cut at the seam, sharing one continuous artwork: closed they
 * butt together and read as one sleeve, and the upper ring travels with the
 * cap when it unscrews. That is also what happens to the real band the first
 * time somebody opens one, and the reference photographs show it: the torn
 * jar's two halves no longer line up, because the cap has been turned since.
 *
 * The screw itself is NOT re-derived. Thread pitch and turn count are never
 * visible under a cap in a photograph, so this reuses the verified constants
 * from the Resin Culture jar rather than inventing numbers that would
 * contradict a mechanism the site already demonstrates.
 *
 * Spec: scratchpad/jar2/sleeve-jar-sculpt-spec.json (validates strict-clean).
 * Reference: 9Bottles jar, patent D781161, read off the base in IMG_8958.
 */
import * as THREE from 'three';
import {
  DIM as JAR_DIM, CONTENTS, LIGHTING,
  lathe, threadHelix, canvasTexture, rosinGeometry, crystalChunks,
} from './createJarModel.js';

/**
 * Millimetres. Proportion is measured; absolute scale is a choice.
 *
 * WHERE THESE COME FROM
 * Thirteen photographs of Remmy's own Melon Sunkist jar: seven with the band
 * intact and six after it was torn open. Read as fractions of the jar's height
 * off the three least foreshortened frames, which agreed inside 3%:
 *
 *     H / D            0.65      wider than it is tall, and that IS the jar
 *     bare wood crown  top 6.4%
 *     printed band     6.4% .. 93.3%
 *     bare glass heel  bottom 6.7%
 *     seam             29.7% up from the base
 *     neck / body      0.80 of the outer radius
 *     cap-top sticker  0.84 of the cap radius
 *
 * WHAT THE FIRST VERSION GOT WRONG, AND WHY
 * It read 0.69 for H/D, which is close, and 0.46 of the height for the cap,
 * which is not: the cap is 0.70 of it. The mistake was reading the band of
 * BARE wood as if it were the cap. Almost the whole cap is under the label.
 *
 * The seam is where the torn jar tore. That is the one place the photographs
 * state it outright: above the tear the band sits on wood, below it on glass,
 * and the two halves are turned relative to each other because the cap has
 * been unscrewed since. The tear is at 0.70 from the crown, so the cap is a
 * deep 23mm puck over a shallow 10mm dish, which is exactly what the open jar
 * shows and exactly right for a concentrate jar: 5ml in this bore is a 5mm
 * pool, so the glass has no reason to be tall.
 */
export const SLEEVE_DIM = {
  R: 25.50,                 // outer radius, D = 51
  H_TOTAL: 33.20,           // 0.65 * D, the whole point of this jar

  // The cap is 0.70 of the jar and nearly all of it is under the label.
  Y_SEAM: 9.85,             // 0.297 * H, where the cap parts from the body
  H_CAP: 23.35,             // H_TOTAL - Y_SEAM

  R_NECK: 20.40,            // 0.80 * R, measured off the open jar
  R_BORE: 17.20,
  Y_NECK_BASE: 11.60,       // shoulder, just above the cap's bottom edge
  Y_RIM: 25.00,             // the glass mouth, up inside the cap
  Y_FLOOR: 3.60,
  PUNT_DEPTH: 1.10,         // base recess: the jar stands on a rim, not a disc
  PUNT_R: 0.62,             // fraction of R, off the base photograph
  BASE_PANEL_R: 0.50,       // printed disc inside the punt, fraction of R

  // The label. One printed band wrapped round the whole jar and cut at the
  // seam, so it splits when the cap turns, the same rule as the other jars.
  SLEEVE_T: 0.18,           // paper thickness, and the height of the crease
  SLEEVE_BOTTOM: 2.22,      // 0.067 * H of bare glass left below it
  SLEEVE_TOP: 31.07,        // 0.064 * H of bare wood left above it
  SLEEVE_LOOSE: 0.18,       // how far the top edge lifts off the wood
  SEAM_ARC: 0.35,           // ~20 degrees, about 9mm of lap at this radius
  KERF: 0.35,               // the hairline the two bands butt across

  STICKER_R: 0.84,          // cap-top sticker, fraction of the cap radius

  // Not re-derived: see the header.
  PITCH: JAR_DIM.PITCH,
  TURNS: JAR_DIM.TURNS,
};
/** Where each band starts and stops, so nothing computes it twice. */
SLEEVE_DIM.BAND = {
  glass: { lo: SLEEVE_DIM.SLEEVE_BOTTOM, hi: SLEEVE_DIM.Y_SEAM - SLEEVE_DIM.KERF / 2 },
  cap:   { lo: SLEEVE_DIM.Y_SEAM + SLEEVE_DIM.KERF / 2, hi: SLEEVE_DIM.SLEEVE_TOP },
};
SLEEVE_DIM.LIFT = SLEEVE_DIM.PITCH * SLEEVE_DIM.TURNS;

/* =====================================================================
   MATERIAL SCALARS

   Authored from the reference crops, NOT from the texture classifier. The
   classifier picks from {gem-metal, gemstone, painted-metal, worn-composite,
   brushed-steel, plastic}; it has no wood, paper or glass, so it returned
   "candy-coat" for hardwood and "painted-metal" for paper. Applied as-is that
   is clearcoat on paper and metalness on wood.
   ===================================================================== */
const FINISH = {
  wood:   { roughness: 0.62, metalness: 0.0, clearcoat: 0.06, clearcoatRoughness: 0.55 },
  glass:  { roughness: 0.10, metalness: 0.0, clearcoat: 0.58, clearcoatRoughness: 0.05 },
  paper:  { roughness: 0.88, metalness: 0.0, clearcoat: 0.0 },
  label:  { roughness: 0.70, metalness: 0.0, clearcoat: 0.10, clearcoatRoughness: 0.40 },
  print:  { roughness: 0.74, metalness: 0.0, clearcoat: 0.0 },
};

/**
 * Take one face's artwork off a label pack, whatever form it arrives in.
 *
 * A pack from makeTemplatePack supplies BUILDERS, not images: `body(W)` returns
 * a full map set {albedo, roughness, normal, ...} at the requested width. A
 * caller can also hand over a bare canvas or bitmap. Both are legitimate, and
 * the first version of this file only understood the second, which is why a
 * generated sleeve jar came out with a blank body and a blank sticker while
 * the geometry was already correct.
 *
 * @returns {{albedo, roughness?, normal?, metalness?}|null}
 */
function faceMaps(face, width) {
  if (!face) return null;
  if (typeof face === 'function') return face(width);       // pack builder
  if (face.albedo) return face;                             // already a map set
  return { albedo: face };                                  // a plain image
}

/** Deterministic small PRNG, so a jar looks the same on every reload. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Wood grain, as an independent albedo AND roughness field.
 *
 * Grain is not noise: it is bands with irregular spacing, and the hard
 * late-wood lines are BOTH darker and smoother than the soft early wood
 * between them. Driving roughness from the same field rather than aliasing
 * albedo into it is what stops the cap reading as printed plastic.
 */
function woodMaps(size, seed) {
  const alb = document.createElement('canvas');
  alb.width = size; alb.height = Math.max(64, size >> 3);
  const rgh = document.createElement('canvas');
  rgh.width = alb.width; rgh.height = alb.height;
  const a = alb.getContext('2d'), r = rgh.getContext('2d');
  const rand = rng(seed);

  // Warmer and darker than the first attempt, which came out the colour of
  // birch ply. The reference cap is a mid-tan hardwood, and the grain is a
  // MODULATION of it rather than stripes drawn on top: the first version read
  // as a barcode because the bands were hard-edged and high contrast.
  a.fillStyle = '#B98F52'; a.fillRect(0, 0, alb.width, alb.height);
  r.fillStyle = '#9E9E9E'; r.fillRect(0, 0, rgh.width, rgh.height);

  // Bands run around the wall, so they are vertical in the wrap. Drawn as soft
  // gradients, not rectangles, because wood has no hard edges between rings.
  let x = 0;
  while (x < alb.width) {
    const w = 5 + rand() * 26;
    const dark = 0.05 + rand() * 0.13;
    const g = a.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(88,58,24,0)');
    g.addColorStop(0.5, `rgba(88,58,24,${dark})`);
    g.addColorStop(1, 'rgba(88,58,24,0)');
    a.fillStyle = g; a.fillRect(x, 0, w, alb.height);
    // late wood is denser: darker AND smoother, so roughness dips with it
    const gr = r.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.5, `rgba(0,0,0,${dark * 1.4})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    r.fillStyle = gr; r.fillRect(x, 0, w, rgh.height);
    x += w * 0.7 + 2 + rand() * 10;
  }
  // a handful of fine hairlines, the only hard-edged thing in real grain
  for (let i = 0; i < 34; i++) {
    a.fillStyle = `rgba(62,40,15,${0.05 + rand() * 0.10})`;
    a.fillRect(rand() * alb.width, 0, 0.8 + rand() * 1.4, alb.height);
  }
  return { albedo: alb, roughness: rgh };
}

/** Fibre tooth for the paper: micro relief only, never a colour change. */
function paperNormal(size = 256, seed = 0x9A17) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  const rand = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 26;
    img.data[i] = 128 + n;
    img.data[i + 1] = 128 + (rand() - 0.5) * 26;
    img.data[i + 2] = 255;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return cv;
}

/** The jar's own profile: wall, shoulder, neck, and the punt it stands on. */
function bodyProfile(D) {
  const p = [];
  const R = D.R, punt = R * D.PUNT_R;
  // stand rim, then up into the recess
  p.push(new THREE.Vector2(0, D.PUNT_DEPTH));
  p.push(new THREE.Vector2(punt - 1.2, D.PUNT_DEPTH));
  p.push(new THREE.Vector2(punt, D.PUNT_DEPTH * 0.55));
  p.push(new THREE.Vector2(punt + 0.9, 0));
  p.push(new THREE.Vector2(R - 1.6, 0));
  // rolled bottom edge
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, ang = (-Math.PI / 2) + t * (Math.PI / 2);
    p.push(new THREE.Vector2(R - 1.6 + Math.cos(ang) * 1.6, 1.6 + Math.sin(ang) * 1.6));
  }
  // straight wall
  p.push(new THREE.Vector2(R, D.Y_SEAM - 2.2));
  // shoulder into the neck
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const rr = R + (D.R_NECK - R) * (t * t * (3 - 2 * t));
    p.push(new THREE.Vector2(rr, D.Y_SEAM - 2.2 + t * 4.1));
  }
  p.push(new THREE.Vector2(D.R_NECK, D.Y_RIM));
  p.push(new THREE.Vector2(D.R_BORE, D.Y_RIM));
  // back down the bore to the inside floor
  p.push(new THREE.Vector2(D.R_BORE, D.Y_NECK_BASE));
  p.push(new THREE.Vector2(D.R_BORE + 1.4, D.Y_NECK_BASE - 1.0));
  p.push(new THREE.Vector2(D.R - 2.6, D.Y_FLOOR + 2.2));
  p.push(new THREE.Vector2(D.R - 3.4, D.Y_FLOOR));
  p.push(new THREE.Vector2(0, D.Y_FLOOR));
  return p;
}

/**
 * The cap: a deep turned puck, FLUSH with the glass.
 *
 * The first version drew it at 0.96 of the jar's radius, which left a visible
 * step at the seam. In every reference frame the wood and the glass are the
 * same diameter and the join is a hairline: the label crosses it without ever
 * changing radius, which is the reason a single band can wrap both.
 */
function capProfileSleeve(D) {
  const p = [];
  const R = D.R, h = D.H_CAP;
  p.push(new THREE.Vector2(0, 0));
  p.push(new THREE.Vector2(R - 0.5, 0));
  // a small chamfer at the bottom edge, which is what catches the light along
  // the seam and keeps the join from reading as a printed line
  p.push(new THREE.Vector2(R, 0.6));
  p.push(new THREE.Vector2(R, h - 1.2));
  // Softened crown. 1.2 rather than 1.6: only 2.13mm of wood stands above the
  // label, so a bigger roundover eats the whole band and the jar loses the
  // flat strip of bare wood that catches the light in every reference frame.
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, ang = t * (Math.PI / 2);
    p.push(new THREE.Vector2(R - 1.2 + Math.cos(ang) * 1.2, h - 1.2 + Math.sin(ang) * 1.2));
  }
  p.push(new THREE.Vector2(0, h));
  return p;
}

/**
 * One ring of the sleeve.
 *
 * Built as an explicit BufferGeometry rather than a CylinderGeometry because
 * a wrapped sheet is not a tube: it has an inner face, an outer face, two rim
 * edges, and one place where it laps over itself. The lap is a real radial
 * step of SLEEVE_T over SEAM_ARC of arc, which is the crease.
 *
 * @param {number} y0 bottom, @param {number} y1 top
 * @param {number} v0 texture V at y0, @param {number} v1 at y1
 * @param {boolean} loose flare the top edge away from the glass
 */
function sleeveRing(D, y0, y1, v0, v1, loose, segments = 320) {
  const pos = [], uv = [], norm = [], idx = [];
  const R0 = D.R + 0.04;                 // sits just off the glass
  const TWO = Math.PI * 2;
  const LAP = D.SEAM_ARC;                // how far the tail laps over the head

  // The sheet is LONGER than the circumference by the lap, which is what makes
  // it a wrapped sheet rather than a tube. It runs 0 .. 2pi+LAP: the first 2pi
  // lies on the glass, the tail lies on top of its own beginning, and the free
  // edge at the very end is the crease.
  const total = TWO + LAP;
  const LIFT_ARC = 0.10;                 // paper climbs onto the lap, not a cliff

  const rows = loose
    ? [{ y: y0, t: 0, out: 0 }, { y: y1 - 1.2, t: 0.96, out: 0 },
       { y: y1, t: 1, out: D.SLEEVE_LOOSE }]
    : [{ y: y0, t: 0, out: 0 }, { y: y1, t: 1, out: 0 }];

  const radiusAt = (a) => {
    if (a <= TWO - LIFT_ARC) return R0;
    if (a < TWO) return R0 + D.SLEEVE_T * ((a - (TWO - LIFT_ARC)) / LIFT_ARC);
    return R0 + D.SLEEVE_T;              // riding on top of its own start
  };

  for (const row of rows) {
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * total;
      const r = R0 + row.out + (radiusAt(a) - R0);
      pos.push(Math.cos(a) * r, row.y, Math.sin(a) * r);
      norm.push(Math.cos(a), 0, Math.sin(a));
      // U runs backwards on purpose. The ring is wound counter-clockwise seen
      // from above, so a forward U puts the artwork on mirrored when read from
      // OUTSIDE, which is where anyone looks at a jar from.
      uv.push(1 - (a / TWO), row.t * (v1 - v0) + v0);
    }
  }
  const ring = segments + 1;
  for (let k = 0; k < rows.length - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const a0 = k * ring + i, b0 = a0 + 1, a1 = a0 + ring, b1 = b0 + ring;
      idx.push(a0, a1, b0, b0, a1, b1);
    }
  }

  // THE CREASE. A radial wall at the free edge, one paper thickness tall, with
  // its OWN vertices so smooth-shading cannot average it into the wall beside
  // it. That averaging is why the first attempt had a lap and no visible crease:
  // the step was there in the geometry and gone in the lighting.
  const base = pos.length / 3;
  const aEnd = total;
  const ca = Math.cos(aEnd), sa = Math.sin(aEnd);
  const yTop = rows[rows.length - 1].y, yBot = rows[0].y;
  const rOut = R0 + D.SLEEVE_T, rIn = R0;
  // outward-facing normal for the edge wall: tangential, not radial
  const nx = -sa, nz = ca;
  for (const [r, y] of [[rOut, yBot], [rOut, yTop], [rIn, yBot], [rIn, yTop]]) {
    pos.push(ca * r, y, sa * r);
    norm.push(nx, 0, nz);
    uv.push(1 - (aEnd / TWO), y === yBot ? v0 : v1);
  }
  idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // deliberately NOT computeVertexNormals: the authored normals keep the crease
  return g;
}

/**
 * Build a squat sleeve jar.
 *
 * Same options and the same sculptRuntime contract as
 * createResinCultureJarModel, so the two are interchangeable at every call
 * site: a jar type is a factory reference, not a branch in the caller.
 */
export function createSleeveJarModel(options = {}) {
  const D = SLEEVE_DIM;
  const pass = options.pass ?? 'full';
  const showMaterials = pass === 'material' || pass === 'full';
  const aniso = options.anisotropy ?? 8;
  const texSize = options.textureSize ?? 4096;
  const label = (typeof options.label === 'object' && options.label !== null)
    ? options.label : {};

  const root = new THREE.Group();
  root.name = 'sleeve-jar';
  const nodes = {}, meshes = {}, sockets = {}, colliders = {}, destructionGroups = {};
  const disposables = [];

  const jarBody = new THREE.Group();
  jarBody.name = 'jar-body';
  root.add(jarBody);
  nodes['jar-body'] = jarBody;

  const lid = new THREE.Group();
  lid.name = 'lid-assembly';
  lid.position.y = D.Y_SEAM;
  root.add(lid);
  nodes['lid-assembly'] = lid;

  /* ---------------------------------------------------------- the glass */
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0E0F11'),
    ...FINISH.glass,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
  });
  disposables.push(glassMat);

  const body = new THREE.Mesh(lathe(bodyProfile(D), 160), glassMat);
  body.name = 'glass-body';
  body.castShadow = body.receiveShadow = true;
  jarBody.add(body);
  meshes['glass-body'] = body;

  // thread on the neck, reusing the verified constants
  const thread = new THREE.Mesh(
    threadHelix(D.R_NECK + 0.35, D.Y_NECK_BASE + 2.6, D.TURNS, D.PITCH, 0.5, 0),
    glassMat,
  );
  thread.name = 'neck-thread';
  jarBody.add(thread);
  meshes['neck-thread'] = thread;

  /* ------------------------------------------------------ the base print */
  if (label.bottom) {
    const botMaps = faceMaps(label.bottom, Math.min(2048, texSize));
    const tex = canvasTexture(botMaps.albedo, { srgb: true, aniso });
    const m = new THREE.MeshPhysicalMaterial({ map: tex, ...FINISH.print });
    const panel = new THREE.Mesh(
      new THREE.CircleGeometry(D.R * D.BASE_PANEL_R, 96), m,
    );
    panel.rotation.x = Math.PI / 2;           // facing down
    // BELOW the punt ceiling, not above it. At +0.03 the glass surface at
    // PUNT_DEPTH sat between the panel and the viewer and the base rendered as
    // a blank disc, with the mesh present the whole time.
    panel.position.y = D.PUNT_DEPTH - 0.05;
    panel.name = 'base-panel';
    jarBody.add(panel);
    meshes['base-panel'] = panel;
    disposables.push(tex, m);
  }

  /* ------------------------------------------------------------ the cap */
  const wood = woodMaps(Math.min(2048, texSize), 0x5EED);
  const woodAlb = canvasTexture(wood.albedo, { srgb: true, aniso });
  const woodRgh = canvasTexture(wood.roughness, { aniso });
  const capMat = new THREE.MeshPhysicalMaterial({
    map: showMaterials ? woodAlb : null,
    roughnessMap: showMaterials ? woodRgh : null,
    color: new THREE.Color(showMaterials ? '#FFFFFF' : '#C9A468'),
    ...FINISH.wood,
    envMapIntensity: 0.85,
  });
  disposables.push(woodAlb, woodRgh, capMat);

  const cap = new THREE.Mesh(lathe(capProfileSleeve(D), 160), capMat);
  cap.name = 'cap-shell';
  cap.castShadow = cap.receiveShadow = true;
  lid.add(cap);
  meshes['cap-shell'] = cap;

  // the mating thread inside the cap
  const capThread = new THREE.Mesh(
    threadHelix(D.R_NECK + 1.05, 3.0, D.TURNS, D.PITCH, 0.5, Math.PI), capMat,
  );
  capThread.name = 'cap-thread';
  lid.add(capThread);
  meshes['cap-thread'] = capThread;

  // the sticker, inset so a ring of bare wood shows around it
  if (label.top) {
    // No UV flip here, tested four ways against a top-down render: a disc lying
    // face-up reads correctly with its default UVs. The mirroring that looked
    // like a texture bug in the first pass was the CYLINDER, and flipping the
    // disc to chase it only broke the one surface that had been right.
    const topMaps = faceMaps(label.top, Math.min(2048, texSize));
    const tex = canvasTexture(topMaps.albedo, { srgb: true, aniso });
    const m = new THREE.MeshPhysicalMaterial({ map: tex, ...FINISH.label });
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(D.R * D.STICKER_R, 96), m,
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = D.H_CAP + 0.12;
    disc.name = 'cap-sticker';
    lid.add(disc);
    meshes['cap-sticker'] = disc;
    disposables.push(tex, m);
  }

  /* --------------------------------------------------------- the sleeve */
  /* ONE PRINTED BAND, CUT AT THE SEAM.
   *
   * This is the change the whole rebuild was for. The first version cut the
   * band somewhere down on the glass and left BOTH halves on the jar, on the
   * theory that a lapped paper tube would let the cap slide out of it. The
   * reference says otherwise: above the tear the paper is stuck to wood, below
   * it to glass, and the two halves sit at different angles because the cap
   * has been turned since. It is a tamper band. It tears at the seam and the
   * top half leaves with the lid.
   *
   * So the cut is the seam, the lower band belongs to the glass and the upper
   * band is parented to the LID. Turn the cap and the label splits, which is
   * the rule the Resin Culture and Charras jars already follow and the thing
   * that makes a jar read as an object rather than a decal.
   */
  const B = D.BAND;
  const CIRC = 2 * Math.PI * D.R;

  /** One band's material. Two bands, two textures, one recipe. */
  function bandMaterial(face, mm, seed) {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(face ? '#FFFFFF' : '#C4327F'),
      ...FINISH.paper,
      envMapIntensity: 0.6,
      side: THREE.DoubleSide,
    });
    if (showMaterials) {
      const maps = faceMaps(face, texSize);
      if (maps) {
        const t = canvasTexture(maps.albedo, { srgb: true, aniso });
        m.map = t;
        disposables.push(t);
        // Paper has its own roughness; a pack's roughness map is for the ink
        // printed on it, so the two multiply rather than one replacing the other.
        if (maps.roughness) {
          const r2 = canvasTexture(maps.roughness, { aniso });
          m.roughnessMap = r2; m.roughness = 1.0;
          disposables.push(r2);
        }
      }
      // Fibre tooth, tiled to stay ISOTROPIC: the two bands are very different
      // heights, so a shared repeat would stretch the grain on the short one
      // into streaks. Repeats are set from the band's real size in millimetres.
      const nrm = canvasTexture(paperNormal(256, seed), { aniso, repeatX: 26 });
      nrm.wrapT = THREE.RepeatWrapping;
      nrm.repeat.set(26, Math.max(1, Math.round(26 * mm / CIRC)));
      m.normalMap = nrm;
      m.normalScale = new THREE.Vector2(0.24, 0.24);
      disposables.push(nrm);
    }
    disposables.push(m);
    return m;
  }

  // The band on the glass. Its whole texture is its own band, so v runs 0..1.
  const glassBand = new THREE.Mesh(
    sleeveRing(D, B.glass.lo, B.glass.hi, 0, 1, false),
    bandMaterial(label.body, B.glass.hi - B.glass.lo, 0x9A17),
  );
  glassBand.name = 'sleeve-lower';
  glassBand.castShadow = glassBand.receiveShadow = true;
  jarBody.add(glassBand);
  meshes['sleeve-lower'] = glassBand;

  // The band on the cap, in the LID's frame so it travels with it. Heights are
  // the same millimetres measured from the seam instead of from the heel.
  const capBand = new THREE.Mesh(
    sleeveRing(D, B.cap.lo - D.Y_SEAM, B.cap.hi - D.Y_SEAM, 0, 1, true),
    bandMaterial(label.skirt ?? label.body, B.cap.hi - B.cap.lo, 0x51CE),
  );
  capBand.name = 'sleeve-upper';
  capBand.castShadow = capBand.receiveShadow = true;
  lid.add(capBand);
  meshes['sleeve-upper'] = capBand;

  /* ------------------------------------------------------- the contents */
  const tint = label.contents ?? CONTENTS.warmBlonde;
  const contents = new THREE.Group();
  contents.name = 'contents-group';
  contents.position.y = D.Y_FLOOR;
  jarBody.add(contents);
  nodes['contents-group'] = contents;

  if (showMaterials) {
    const surface = tint.surface ?? null;
    const geo = rosinGeometry(surface);
    const mound = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(tint.color),
      transmission: tint.finish?.transmission ?? 0.16,
      thickness: 8,
      attenuationColor: new THREE.Color(tint.attenuation),
      attenuationDistance: 14,
      roughness: 0.34,
      clearcoat: tint.finish?.clearcoat ?? 0.6,
      clearcoatRoughness: tint.finish?.clearcoatRoughness ?? 0.16,
      envMapIntensity: tint.finish?.envMapIntensity ?? 1.0,
      ior: 1.46,
    }));
    mound.name = 'rosin-mound';
    // The mound geometry was authored for the tall jar's 42mm interior. Dropped
    // in unscaled it fills this jar to the brim, because the whole cavity here
    // is 21mm deep against that jar's 32. Scaled to the bore across, and to the
    // headroom it actually has up the axis: five millilitres in a 17mm bore is
    // a five millimetre pool, so a shallow one is the honest shape.
    mound.scale.set(D.R_BORE / 17.5, 0.30, D.R_BORE / 17.5);
    contents.add(mound);
    meshes['rosin-mound'] = mound;
    disposables.push(mound.material);
    if (surface?.crystals) crystalChunks(surface, geo, contents);
  }

  /* --------------------------------------------------------- the runtime */
  sockets['neck-thread'] = { position: [0, D.Y_NECK_BASE, 0], axis: [0, 1, 0] };
  sockets['cap-top'] = { position: [0, D.Y_SEAM + D.H_CAP, 0], axis: [0, 1, 0] };
  sockets['base-punt'] = { position: [0, D.PUNT_DEPTH, 0], axis: [0, -1, 0] };
  sockets['body-wall'] = { position: [0, D.SLEEVE_BOTTOM, 0], axis: [0, 1, 0] };
  colliders['body'] = { type: 'cylinder', radius: D.R, height: D.H_TOTAL };
  // sleeve-upper moved sides: it is stuck to the wood, so it leaves with the
  // lid. Leaving it in the jar's group would have the label survive an impact
  // that took the cap off, which is the opposite of how a tamper band fails.
  destructionGroups['lid'] = ['cap-shell', 'cap-thread', 'cap-sticker', 'sleeve-upper'];
  destructionGroups['jar'] = ['glass-body', 'neck-thread', 'base-panel',
                              'sleeve-lower'];

  const capHome = lid.position.clone();

  /**
   * 0 closed, 1 thread released, 2 set aside. Identical semantics to the
   * Resin Culture jar so callers never have to ask which jar they hold.
   */
  function setOpen(t) {
    const tt = THREE.MathUtils.clamp(t, 0, 2);
    const screw = Math.min(tt, 1);
    const rise = screw * D.LIFT;
    lid.rotation.y = -(rise / D.PITCH) * Math.PI * 2;   // coupled: rise -> turns
    lid.position.y = capHome.y + rise;

    const free = Math.max(0, tt - 1);
    const e = free * free * (3 - 2 * free);
    // Rises clear of the GLASS RIM before it travels sideways. The paper collar
    // the old 17mm arc was dodging is gone: the upper band is parented to the
    // lid now and leaves with it. What is left to clear is the neck, whose rim
    // stands at 25 while the thread only lifts the cap to 18.
    lid.position.y += Math.sin(e * Math.PI) * 9.0 - e * (D.Y_SEAM + D.LIFT - 0.6);
    lid.position.x = capHome.x - e * 58.0;
    lid.position.z = capHome.z + e * 12.0;
    lid.rotation.z = e * 0.15;
    lid.rotation.x = e * 0.05;

    root.userData.sculptRuntime.openAmount = tt;
    root.userData.sculptRuntime.isOpen = tt >= 1;
  }

  root.userData.sculptRuntime = {
    nodes, meshes, sockets, colliders, destructionGroups,
    dimensions: D,
    pass,
    openAmount: 0,
    isOpen: false,
    setOpen,
    constraints: [{
      id: 'cap-screw', target: 'lid-assembly', axis: [0, 1, 0],
      pitchMm: D.PITCH, turnsToRelease: D.TURNS,
      rule: `translationY = (rotationY / 2*pi) * pitch, clamped to 0..${D.LIFT} mm`,
    }],
    dispose() {
      for (const d of disposables) d.dispose?.();
      root.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m?.dispose?.();
        }
      });
    },
  };
  root.userData.actionReadiness = {
    note: 'root.userData.sculptRuntime.setOpen(t) drives the screw: 0 closed, 1 thread released, 2 set aside.',
  };
  setOpen(0);
  return root;
}

/** The two jar types, so a caller picks a shape by name rather than by import. */
export const JAR_TYPES = {
  tall: {
    id: 'tall',
    name: 'Tall jar',
    blurb: 'The straight-sided jar with a printed wrap and a black screw cap.',
    heightOverDiameter: 0.839,
  },
  sleeve: {
    id: 'sleeve',
    name: 'Squat sleeve jar',
    blurb: 'Shorter and wider, deep wooden cap, paper band cut at the seam.',
    heightOverDiameter: 0.65,
  },
};
