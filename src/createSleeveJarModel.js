/**
 * createSleeveJarModel.js — the squat sleeve jar (9Bottles type).
 *
 * The second jar the industry actually uses, and it is not the first one
 * rescaled. Measured off the reference photographs at H/D 0.69 against the
 * Resin Culture jar's 0.839, which is the difference between a jar that
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
 * time somebody opens one.
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
 * The outer diameter is set to 52 so this jar and the 50mm Resin Culture jar
 * sit on one shelf at a believable relative size. Everything else follows the
 * ratios read off grid_IMG_8956 (height 610px across the axis, diameter
 * 885px, cap wall visible 0.107 of the height, sleeve 0.83, glass below the
 * sleeve 0.066).
 */
export const SLEEVE_DIM = {
  R: 26.0,                  // outer radius
  H_TOTAL: 35.88,           // 0.69 * D, the whole point of this jar

  // The cap is HALF the jar. Four independent readings of the photographs put
  // it at 0.45, 0.46, 0.46 and 0.49 of the total height. An earlier 0.30 came
  // from measuring the band of BARE wood, which is small only because the
  // sleeve covers most of the cap.
  H_CAP: 16.50,             // 0.46 * H
  Y_SEAM: 19.38,            // H_TOTAL - H_CAP

  R_NECK: 21.5,
  R_BORE: 18.0,
  Y_NECK_BASE: 16.8,        // shoulder starts below the seam
  Y_RIM: 27.5,              // the glass mouth, up inside the cap
  Y_FLOOR: 3.0,
  PUNT_DEPTH: 1.1,          // base recess: the jar stands on a rim, not a disc
  PUNT_R: 0.86,             // fraction of R
  BASE_PANEL_R: 0.765,      // printed disc inside the punt, fraction of R

  // The sleeve
  SLEEVE_T: 0.18,           // paper thickness, and the height of the crease
  SLEEVE_BOTTOM: 1.97,      // 0.055 * H, leaving a strip of glass below
  SLEEVE_TOP: 33.55,        // 0.065 H of bare wood left above it
  SLEEVE_LOOSE: 0.22,       // how far the top edge lifts off the glass
  SEAM_ARC: 0.35,           // ~20 degrees, about 9mm of lap at this radius

  // THE CUT. A single flat ring at 0.69 of the height measured from the top,
  // which is about 0.23 H BELOW the wood/glass seam, down on the glass. The
  // owner's own cut wanders roughly 0.035 H around the circumference; this is
  // the clean version of it, which is what they asked for.
  CUT_Y: 11.12,             // H_TOTAL * (1 - 0.69)
  CUT_GAP: 0.75,            // 0.021 * H, the width of the kerf

  STICKER_R: 0.80,          // cap-top sticker, fraction of the cap radius;
                            // measured against the top reference, which leaves a
                            // wider ring of bare wood than the first estimate

  // Not re-derived: see the header.
  PITCH: JAR_DIM.PITCH,
  TURNS: JAR_DIM.TURNS,
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

/** The cap: squat, wide, with a broken top edge. */
function capProfileSleeve(D) {
  const p = [];
  const R = D.R * 0.96, h = D.H_CAP;
  p.push(new THREE.Vector2(0, 0));
  p.push(new THREE.Vector2(D.R_NECK + 0.4, 0));
  p.push(new THREE.Vector2(D.R_NECK + 0.4, 1.6));
  p.push(new THREE.Vector2(R, 2.6));
  p.push(new THREE.Vector2(R, h - 1.1));
  // softened top edge, the bevel the reference shows
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, ang = t * (Math.PI / 2);
    p.push(new THREE.Vector2(R - 1.1 + Math.cos(ang) * 1.1, h - 1.1 + Math.sin(ang) * 1.1));
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
      new THREE.CircleGeometry(D.R * 0.96 * D.STICKER_R, 96), m,
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = D.H_CAP + 0.12;
    disc.name = 'cap-sticker';
    lid.add(disc);
    meshes['cap-sticker'] = disc;
    disposables.push(tex, m);
  }

  /* --------------------------------------------------------- the sleeve */
  // One artwork, two rings, cut at the seam. Closed they butt together and
  // read as a single band; the upper ring rides the cap when it unscrews.
  // One artwork, split by the CUT rather than by the seam. Both halves stay
  // with the jar: the upper one spans the wood/glass junction and wraps the
  // lower half of the cap, and because it is a lapped tube rather than glued
  // paper the cap simply rises out of it and comes away bare. That is what the
  // photograph of the jar in pieces shows, and it is why neither band is
  // parented to the lid.
  const span = D.SLEEVE_TOP - D.SLEEVE_BOTTOM;
  const vCut = (D.CUT_Y - D.SLEEVE_BOTTOM) / span;

  const sleeveMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(label.body ? '#FFFFFF' : '#C4327F'),
    ...FINISH.paper,
    envMapIntensity: 0.6,
    side: THREE.DoubleSide,
  });
  if (showMaterials) {
    const bodyMaps = faceMaps(label.body, texSize);
    if (bodyMaps) {
      const t = canvasTexture(bodyMaps.albedo, { srgb: true, aniso });
      sleeveMat.map = t;
      disposables.push(t);
      // Paper has its own roughness; a pack's roughness map is for the printed
      // ink on it, so the two are multiplied rather than one replacing the other.
      if (bodyMaps.roughness) {
        const r2 = canvasTexture(bodyMaps.roughness, { aniso });
        sleeveMat.roughnessMap = r2; sleeveMat.roughness = 1.0;
        disposables.push(r2);
      }
    }
    const nrm = canvasTexture(paperNormal(256, 0x9A17), { aniso, repeatX: 26 });
    nrm.wrapT = THREE.RepeatWrapping; nrm.repeat.set(26, 5);
    sleeveMat.normalMap = nrm;
    sleeveMat.normalScale = new THREE.Vector2(0.24, 0.24);
    disposables.push(nrm);
  }
  disposables.push(sleeveMat);

  const lower = new THREE.Mesh(
    sleeveRing(D, D.SLEEVE_BOTTOM, D.CUT_Y, 0, vCut, false), sleeveMat,
  );
  lower.name = 'sleeve-lower';
  lower.castShadow = lower.receiveShadow = true;
  jarBody.add(lower);
  meshes['sleeve-lower'] = lower;

  // The kerf: a real gap, not a drawn line. Both cut faces are open paper
  // edges, which is what makes a clean cut read as a cut rather than a seam.
  const upper = new THREE.Mesh(
    sleeveRing(D, D.CUT_Y + D.CUT_GAP, D.SLEEVE_TOP,
               vCut + D.CUT_GAP / span, 1, true), sleeveMat,
  );
  upper.name = 'sleeve-upper';
  upper.castShadow = upper.receiveShadow = true;
  jarBody.add(upper);
  meshes['sleeve-upper'] = upper;

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
    // straight in here it topped out at y=23 in a jar whose neck starts at 26,
    // so the jar read as filled to the brim. Wider and much shallower: this
    // bore is 18 against 17.5, and the fill has a third less headroom to use.
    mound.scale.set(D.R_BORE / 17.5, 0.34, D.R_BORE / 17.5);
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
  destructionGroups['lid'] = ['cap-shell', 'cap-thread', 'cap-sticker'];
  destructionGroups['jar'] = ['glass-body', 'neck-thread', 'base-panel',
                              'sleeve-lower', 'sleeve-upper'];

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
    // Rises clear of the paper collar before it travels sideways: the collar
    // now reaches 14mm up the cap, so the old 10mm arc dragged the cap through
    // it on the way out.
    lid.position.y += Math.sin(e * Math.PI) * 17.0 - e * (D.Y_SEAM + D.LIFT - 0.6);
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
    blurb: 'Shorter and wider, wooden cap, paper sleeve with a visible crease.',
    heightOverDiameter: 0.69,
  },
};
