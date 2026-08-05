/**
 * displayCase.js — the cabinet the jars live in.
 *
 * WHAT THIS REPLACES
 * A single plank with thin dividers and three lines of DOM text floating over
 * the canvas. It worked, and it had two problems that were never going to be
 * fixed by adjusting it. A row that grows sideways forever needs the camera
 * further and further back, so the more jars you owned the smaller each one
 * got. And an almost empty plank reads as a bug rather than as a beginning.
 *
 * A case fixes both by having WALLS. The frame is set by the case, not by the
 * contents, so the camera never moves and jar six looks exactly as big as jar
 * one. And a case with room left in it is obviously a case with room left in
 * it, which is the thing that makes filling it up feel like something.
 *
 * THE PARTS
 *   carcass    back, two sides, top, bottom. Dark, matte, unremarkable on
 *              purpose: it is the thing the jars are seen against.
 *   shelves    one board per section, each with a label plate on its front
 *              edge. The plate is geometry, not an overlay, so it can never
 *              drift away from the shelf it names or get clipped by a window.
 *   door       one glass leaf, hinged left, swinging out. setDoor(t) drives it.
 *
 * WHY THE GLASS IS FAKE
 * MeshPhysicalMaterial.transmission is real refraction and it is the correct
 * way to render glass. It also allocates a render target the size of the whole
 * drawing buffer and renders the scene an extra time every frame, which on the
 * phone this site has already crashed once is not affordable for a pane the
 * size of the entire cabinet. So the door is a cheap transparent surface with a
 * strong specular sheen and an edge highlight, which is what actually reads as
 * glass at this distance. What is lost is refraction: things behind the door do
 * not bend. Nobody has ever noticed that in a product shot.
 */

/**
 * @param {object}   o
 * @param {THREE}    o.THREE          the module, passed in so this file imports nothing
 * @param {string[]} o.sections       bay ids, top shelf first
 * @param {object}   o.labels         { [bayId]: string } what each shelf is called
 * @param {number}  [o.slots]         jars a shelf should hold before it compresses
 * @param {boolean} [o.compact]       phone proportions
 */
export function createDisplayCase({ THREE, sections, labels = {}, counts = {},
                                   slots = 4, compact = false }) {
  const S = Math.max(1, sections.length);

  /* FOUR TO A SHELF, AND A SECTION THAT NEEDS MORE GETS MORE SHELVES.

     The previous rule divided the shelf width by however many jars a section
     held, so past four the pitch fell below the jar itself: six on a phone
     shelf came out at 38.7mm against a 51mm jar, which is glass through glass
     by 12mm, and every jar added made it worse.

     A cabinet does not squeeze a row tighter, it grows. Each section gets as
     many boards as it needs at four a board, and the case is as tall as the
     sum of them. So the spacing never changes, a jar is always the same size,
     and a section that is filling up says so by taking more of the case. */
  const rowsFor = (bay) => Math.max(1, Math.ceil((counts[bay] || 0) / slots));
  const ROWS = sections.map(rowsFor);
  const TOTAL_ROWS = ROWS.reduce((a, b) => a + b, 0);
  /* The widest jar this case has to hold, so spacing can be checked against
     the thing being spaced rather than against a number somebody typed.
     SLEEVE_DIM.R is 25.5, so 51 across, plus a millimetre so neighbours do not
     touch exactly. */
  const JAR_D = 52;

  /* ── proportions ───────────────────────────────────────────────────────
     Driven by the jar, not chosen. A jar is 52mm across and 42mm tall, and
     the cap travels up and sideways when it unscrews, so a shelf needs real
     headroom or opening a jar drives its lid through the board above.

     The case is deliberately closer to square than a plank ever was: a wide
     shallow row wastes the whole vertical half of a portrait phone screen and
     then makes the camera stand off to fit the width it did use. */
  const D = {
    slotW:   compact ? 58 : 72,          // one jar's share of a shelf
    clearH:  compact ? 96 : 112,         // shelf surface to the board above
    wall:    9,                          // carcass thickness
    board:   7,                          // a shelf board
    depth:   compact ? 132 : 158,        // front to back, inside
    reveal:  14,                         // plinth below the lowest shelf
    plateH:  compact ? 13 : 15,          // the label strip on a shelf's edge
  };
  D.innerW = D.slotW * slots;
  D.innerH = TOTAL_ROWS * D.clearH;
  D.outerW = D.innerW + D.wall * 2;
  D.outerH = D.innerH + D.wall * 2 + D.reveal;
  D.outerD = D.depth + D.wall;

  const root = new THREE.Group();
  root.name = 'display-case';
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  /* ── materials ─────────────────────────────────────────────────────────
     Three, and they are all cheap. The carcass is the backdrop and wants to
     disappear; the metal is the only thing allowed to catch a highlight. */
  const carcass = keep(new THREE.MeshStandardMaterial({
    color: new THREE.Color('#15181C'), roughness: 0.82, metalness: 0.04,
  }));
  const inner = keep(new THREE.MeshStandardMaterial({
    // A shade lighter than the outside so the box reads as having an inside.
    color: new THREE.Color('#1B1F25'), roughness: 0.7, metalness: 0.05,
  }));
  const metal = keep(new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8A9099'), roughness: 0.34, metalness: 0.9,
  }));

  /* GLASS SHELVES. A solid board hides whatever is under it, which on a case
     three sections deep means the bottom two are lit and looked at through a
     letterbox. Glass shelves let the whole stack read at once.

     No transmission here either, for the same reason as the door: it costs a
     full extra scene pass and a drawing-buffer-sized render target, and there
     would now be three of them. A thin transparent surface with a hard
     specular is what reads as a glass shelf anyway, because what sells it is
     the EDGE catching light, not refraction through 7mm of float glass.

     castShadow off. A glass shelf that threw a solid shadow onto the jars
     below would undo the thing it is here to do. */
  const glassShelf = keep(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#C6D8E4'),
    transparent: true,
    /* 0.06, not the 0.13 this started at, and the reason is that a BOX is not
       one surface. At DoubleSide the camera looks through the top face, the
       cavity and the bottom face, so the opacities compound and the sheet
       lands near 0.25. FrontSide and half the value put the actual result
       where 0.13 was aiming.

       Clearcoat and env are down for the same class of reason: the camera sits
       above the case, so every shelf is seen at a grazing angle, and that is
       exactly where a strong specular turns clear glass into a white plane.
       Physically right, and it defeats the entire point of a glass shelf. */
    opacity: 0.06,
    roughness: 0.04,
    metalness: 0.0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.04,
    envMapIntensity: 0.85,
    side: THREE.FrontSide,
    depthWrite: false,
  }));

  const box = (w, h, d, mat, x, y, z, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };

  /* ── carcass ───────────────────────────────────────────────────────────
     Origin at the middle of the case floor, so a shelf's y is simply how far
     up the case it is and a jar sits at its shelf's y with no offset maths. */
  const halfW = D.outerW / 2;
  const zBack = -D.depth / 2 - D.wall / 2;
  const zMidD = 0;

  /* THE FLOOR IS SOLID, and it is the only horizontal surface that is. Every
     shelf above it is glass so the whole stack can be seen through at once;
     the bottom of a case is the bottom, and glass there would show the
     underside of the furniture. It is also what gives the stack somewhere to
     end, which a case made entirely of glass shelves does not have. */
  const floorMat = keep(new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0A0C0E'), roughness: 0.55, metalness: 0.08,
  }));
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(D.outerW, D.wall, D.outerD), floorMat);
  floor.position.set(0, -D.wall / 2, zMidD);
  floor.name = 'case-floor';
  floor.receiveShadow = true;
  root.add(floor);
  box(D.outerW, D.wall, D.outerD, carcass, 0, D.outerH - D.wall / 2 - D.reveal, zMidD, 'case-top');
  box(D.wall, D.outerH, D.outerD, carcass, -halfW + D.wall / 2, D.outerH / 2 - D.reveal, zMidD, 'case-left');
  box(D.wall, D.outerH, D.outerD, carcass, halfW - D.wall / 2, D.outerH / 2 - D.reveal, zMidD, 'case-right');
  box(D.outerW, D.outerH, D.wall, inner, 0, D.outerH / 2 - D.reveal, zBack, 'case-back');

  /* ── shelves, top section first ────────────────────────────────────────
     sections[0] is the top shelf because that is where the eye lands and the
     first section is the one that matters. A free account has one section, and
     one shelf in a one-shelf case has to look intended rather than lonely,
     which is why the case height follows the ROW count rather than the section
     count: a section with nine jars owns three boards and takes three boards'
     worth of case. */
  const shelves = [];
  /* Boards are laid out from the BOTTOM up so the arithmetic is a single
     running cursor, then sections read top-down because section 0 is the one
     the eye lands on. A section owning three boards owns three consecutive
     ones, and its label goes on the lowest of them. */
  const rowY = [];
  {
    let cursor = 0;
    for (let i = S - 1; i >= 0; i--) {
      const ys = [];
      for (let r = 0; r < ROWS[i]; r++) { ys.push(cursor); cursor += D.clearH; }
      rowY[i] = ys;                      // lowest board first within a section
    }
  }

  for (let i = 0; i < S; i++) {
    const bay = sections[i];
    const y = rowY[i][0];
    const g = new THREE.Group();
    g.name = 'shelf-' + bay;
    g.position.set(0, y, 0);
    root.add(g);

    // Every row above the case floor gets a board. The lowest row of the
    // lowest section stands on the floor itself, so it gets none: a board
    // lying on a board.
    for (let r = 0; r < ROWS[i]; r++) {
      const ry = rowY[i][r];
      if (ry <= 0.01) continue;
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(D.innerW, D.board, D.depth), glassShelf);
      b2.position.set(0, ry - D.board / 2, 0);
      b2.receiveShadow = false; b2.castShadow = false;
      b2.renderOrder = 2;
      b2.name = 'shelf-board';
      root.add(b2);
      const lip2 = new THREE.Mesh(new THREE.BoxGeometry(D.innerW, D.board, 1.6), metal);
      lip2.position.set(0, ry - D.board / 2, D.depth / 2 - 0.8);
      lip2.name = 'shelf-lip';
      root.add(lip2);
    }

    shelves.push({ bay, y, rows: rowY[i], group: g, label: null });
  }

  /* ── label plates ──────────────────────────────────────────────────────
     GEOMETRY, not a DOM overlay. The old captions were HTML positioned from a
     projected 3-D point, which meant they drifted, needed clamping to stay on
     screen, and got sliced in half by the window edge on a phone. A plate
     screwed to the front of the shelf it names cannot do any of that: it is
     part of the object and the camera treats it like everything else. */
  /**
   * The label on a shelf's front edge.
   *
   * THE CANVAS MUST HAVE THE PLATE'S PROPORTIONS. The first version drew into
   * a 512 x 64 canvas, an 8:1 rectangle, and mapped it onto a plate that is
   * 430 x 15, which is 28.6:1. Every letter came out stretched 3.6 times
   * wider than it was drawn. That is not a font problem or a spacing problem,
   * which is what it looks like: a UV map does not care what is in the texture
   * and will stretch a canvas of the wrong shape without complaint.
   *
   * So the canvas is built FROM the plate, and the text is fitted to it:
   * measured, and shrunk to fit if the label is long, because a section could
   * be renamed to something longer than "Current rotation" and a name that
   * runs off its own plate is worse than a name set slightly smaller.
   */
  function plateTexture(text, plateW, plateH) {
    const aspect = plateW / plateH;
    // Resolution is set on the SHORT axis, where the detail actually is.
    const H = 96;
    const W = Math.max(64, Math.round(H * aspect));
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');

    c.fillStyle = '#0D1013';
    c.fillRect(0, 0, W, H);
    // a hairline along the top, the way an engraved plate catches light
    c.fillStyle = 'rgba(237,241,245,.16)';
    c.fillRect(0, 0, W, Math.max(1, Math.round(H * 0.02)));

    const label = String(text || '').toUpperCase();
    const padX = Math.round(H * 0.55);
    const room = W - padX * 2;

    // Fit, rather than hope. Start at a size proportional to the plate's
    // height and step down until the label fits the plate it is printed on.
    let size = Math.round(H * 0.46);
    const track = () => Math.max(1, size * 0.22);      // letter spacing
    const widthAt = () => {
      c.font = `600 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
      return c.measureText(label).width + track() * Math.max(0, label.length - 1);
    };
    while (size > 8 && widthAt() > room) size -= 1;

    c.fillStyle = '#E7ECF1';
    c.textBaseline = 'middle';
    // Drawn character by character so the tracking is real geometry rather
    // than the ctx.letterSpacing property, which several browsers still ignore
    // and which would have silently changed the fit on the ones that do not.
    let x = padX;
    const y = H / 2 + H * 0.02;
    for (const ch of label) {
      c.fillText(ch, x, y);
      x += c.measureText(ch).width + track();
    }

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    // The plate is a long thin strip seen at a glancing angle, which is the
    // exact case mipmapping blurs into mush. Linear, no mips: the texture is
    // never minified far enough for aliasing to beat the blur.
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    return t;
  }

  const plateW = D.innerW * 0.995;
  for (const sh of shelves) {
    const tex = keep(plateTexture(labels[sh.bay] ?? sh.bay, plateW, D.plateH));
    const mat = keep(new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.55, metalness: 0.15,
    }));
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(plateW, D.plateH), mat);
    // On the front lip of the board, tipped down a few degrees so it faces a
    // camera that is always slightly above.
    plate.position.set(0, -D.board - D.plateH / 2 + 1, D.depth / 2 + 0.6);
    plate.rotation.x = -0.14;
    plate.name = 'shelf-plate';
    sh.group.add(plate);
    sh.label = plate;
  }

  /* ── the trim, one strip under every shelf ────────────────────────────
     The case does not decide what colour these are. shelfFx owns the modes,
     the palette and the rainbow phase, because the trim on this case and the
     trim on the public shelf have to be the same thing or they will drift.
     paintTrim() borrows that module's colour function and nothing else.

     A texture per strip rather than a light per strip: nine spill lights
     already exist, and adding three more real lights would raise the
     per-frame lighting cost of every material in the scene for a cabinet
     whose interior is meant to GLOW rather than to cast. toneMapped false so
     a strip stays a light source instead of being pulled back toward the
     scene's exposure like a lit surface. */
  /* THE BLOOM, done in geometry.
     A bright line only reads as a LIGHT if something spills off it. The proper
     way is a post-processing bloom pass, and there is none vendored here: it
     would mean five more files and about thirteen extra draw passes a frame,
     on the device that ran out of memory this morning.
     For a STRAIGHT strip the shape of the spill is known in advance, so it can
     be a quad with a soft gradient in it, additively blended, tinted from the
     same colour as the strip. Two of them, above and below. Three extra quads
     against a whole post chain, and for a horizontal line it is most of the
     look. What is lost is bloom on everything ELSE bright, the jar highlights
     and the door edge, which a real pass would also catch. */
  const bloomTex = (() => {
    const H = 64, cv = document.createElement('canvas');
    cv.width = 4; cv.height = H;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, H);
    // Two falloffs summed: a tight core and a wide haze, which is what a real
    // bloom kernel does and what a single gradient never looks like.
    g.addColorStop(0.00, 'rgba(255,255,255,0)');
    g.addColorStop(0.34, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.47, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.50, 'rgba(255,255,255,1)');
    g.addColorStop(0.53, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.66, 'rgba(255,255,255,0.10)');
    g.addColorStop(1.00, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 4, H);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  keep(bloomTex);

  const STRIPS = [];
  for (const sh of shelves) {
    // Every shelf gets one, including the lowest. It has no board of its own,
    // so its strip rides the case floor's front lip instead, which is where a
    // real cabinet puts it.
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 1;
    const tex = keep(new THREE.CanvasTexture(cv));
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = keep(new THREE.MeshBasicMaterial({
      map: tex, toneMapped: false, transparent: true, opacity: 0.92,
    }));
    /* UNDER the label plate, and in front of it.
       The first placement put the strip at y = -8 and z = depth/2 - 6, which
       is inside the plate's own 15mm height and 6mm behind its face, so the
       plate occluded it completely on every shelf that has one. Only the
       bottom shelf, which has no plate, appeared lit, which read as one strip
       having been built rather than three being hidden.
       Under the plate is also where the light belongs: it spills down onto the
       jars below instead of washing out the label it sits beside. */
    const strip = new THREE.Mesh(new THREE.BoxGeometry(D.innerW * 0.97, 1.8, 2.4), mat);
    strip.position.set(0, -D.board - D.plateH - 2.4, D.depth / 2 + 1.2);
    strip.name = 'shelf-trim';
    strip.visible = false;                    // nothing until a colour arrives
    sh.group.add(strip);

    /* The spill. AdditiveBlending so it only ever brightens, depthWrite off so
       it cannot occlude a jar standing in front of it, and rendered after the
       solid geometry so the sum is right. */
    const glowMat = keep(new THREE.MeshBasicMaterial({
      map: bloomTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, opacity: 0.85,
      side: THREE.DoubleSide,
    }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(D.innerW * 0.99, 46), glowMat);
    glow.position.copy(strip.position);
    glow.position.z += 1.6;
    glow.renderOrder = 3;
    glow.visible = false;
    glow.name = 'shelf-trim-bloom';
    sh.group.add(glow);

    STRIPS.push({ mesh: strip, glow, glowMat, cv, ctx: cv.getContext('2d'), tex });
  }

  /**
   * Paint every strip from a colour function, or turn them all off.
   *
   * @param {(t:number)=>THREE.Color|null} colourAt  position along the strip,
   *        0 to 1, exactly the signature shelfFx.trimColourAt already has.
   *        Pass null for off.
   */
  function paintTrim(colourAt) {
    for (const s of STRIPS) {
      s.mesh.visible = !!colourAt;
      s.glow.visible = !!colourAt;
      if (!colourAt) continue;
      for (let i = 0; i < s.cv.width; i++) {
        const c = colourAt(i / (s.cv.width - 1));
        s.ctx.fillStyle = '#' + c.getHexString();
        s.ctx.fillRect(i, 0, 1, 1);
      }
      s.tex.needsUpdate = true;
      /* The spill takes the strip's MIDDLE colour rather than its own copy of
         the gradient. A rainbow strip blooming in rainbow reads as a second
         strip; blooming in one colour reads as light coming off the first. */
      s.glowMat.color.copy(colourAt(0.5));
    }
  }

  /* ── the door ──────────────────────────────────────────────────────────
     One leaf, hinged on the left, in its own pivot group so the hinge is an
     axis rather than an offset somebody has to remember. */
  const hinge = new THREE.Group();
  hinge.name = 'door-hinge';
  hinge.position.set(-halfW, D.outerH / 2 - D.reveal, D.outerD / 2 - D.wall / 2);
  root.add(hinge);

  const glassMat = keep(new THREE.MeshPhysicalMaterial({
    // Nearly colourless. The first pass used a blue-grey at 0.16 and it laid a
    // haze over the whole interior: the jars are the product and the pane in
    // front of them was desaturating every one. Glass this size reads as glass
    // from its EDGES and its highlight, not from its tint.
    color: new THREE.Color('#DCE8F0'),
    // No transmission. See the header: real refraction costs a full extra
    // scene pass and a drawing-buffer-sized render target every frame, and
    // this pane is the size of the entire case.
    transparent: true,
    opacity: 0.07,
    roughness: 0.06,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
    depthWrite: false,          // or it occludes the jars it is meant to show
  }));

  const doorW = D.outerW, doorH = D.outerH - D.reveal;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 16, doorH - 16), glassMat);
  pane.position.set(doorW / 2, 0, 0);
  pane.name = 'door-glass';
  hinge.add(pane);

  // A thin frame, because a floating sheet of glass reads as a rendering
  // mistake and four edges are what tell you it is a door.
  const fr = 6;
  const frame = new THREE.Group();
  frame.name = 'door-frame';
  for (const [w, h, x, y] of [
    [doorW, fr, doorW / 2, doorH / 2 - fr / 2],
    [doorW, fr, doorW / 2, -doorH / 2 + fr / 2],
    [fr, doorH, fr / 2, 0],
    [fr, doorH, doorW - fr / 2, 0],
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 5), metal);
    m.position.set(x, y, 0);
    m.castShadow = true;
    frame.add(m);
  }
  hinge.add(frame);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 46, 12), metal);
  handle.position.set(doorW - 20, 0, 7);
  handle.name = 'door-handle';
  hinge.add(handle);

  /* ── the runtime ───────────────────────────────────────────────────────── */
  let doorT = 0;
  /* 93 degrees. Not a style choice: the door is as wide as the case, so at the
     106 degrees this started at, the free edge swung to x = -349 while the
     camera could only see to -254, and the open door was cut off by the window.
     At 93 it lands at -264, which the framing margin below covers. */
  const SWING = -1.62;

  /** 0 shut, 1 wide open. Eased here so every caller gets the same motion. */
  function setDoor(t) {
    doorT = Math.max(0, Math.min(1, t));
    const e = doorT * doorT * (3 - 2 * doorT);
    hinge.rotation.y = e * SWING;
    // The glass catches less light square on than it does swung open, which
    // is most of what sells the movement.
    glassMat.opacity = 0.07 + e * 0.04;
  }

  /**
   * Where does the nth jar of this bay stand?
   *
   * The case does the placing because the case knows its own walls. A row
   * COMPRESSES rather than overflowing: past `slots` jars the pitch shrinks so
   * they still fit between the sides. That is the honest behaviour for a
   * cabinet, and it means a shelf can never spill out of the box the way the
   * old plank silently did.
   */
  function slotFor(bay, index, count) {
    const sh = shelves.find((s) => s.bay === bay) || shelves[0];
    const n = Math.max(1, count);

    /* A SHELF HAS DEPTH, AND IT WAS NOT BEING USED.
       This divided the width by however many jars there were, so past `slots`
       the pitch fell below the jar itself: at six jars on a phone shelf it was
       38.7mm against a 51mm jar, which is glass through glass by 12mm, and it
       got worse with every jar added. Exactly the same mistake as the 46mm
       phone pitch, one layer up.

       A real cabinet does not crush a row, it starts a second one behind. The
       interior is 132mm deep and a jar is 51mm across, so two rows fit with
       room between them, and the back row is offset half a pitch so its jars
       sit in the gaps of the front row instead of hiding behind them. */
    /* Four to a board, filling the section's TOP board first and working
       down, because a section fills the way you read it. The pitch is a
       constant, so a jar never changes size and never touches its neighbour. */
    const ys = sh.rows;                        // lowest board first
    const row = Math.min(ys.length - 1, Math.floor(index / slots));
    const inRow = index - row * slots;
    const rowCount = Math.min(slots, n - row * slots);
    const pitch = D.slotW;
    const span = (rowCount - 1) * pitch;

    return {
      x: -span / 2 + inRow * pitch,
      // row 0 is the section's TOP board, which is the last entry in ys.
      y: ys[ys.length - 1 - row],
      z: 0,
      pitch,
      scale: 1,
    };
  }

  root.userData.caseRuntime = {
    dims: D,
    counts,          // what it was built for, so a caller can tell if it changed
    rows: ROWS,
    shelves,
    setDoor,
    paintTrim,
    get doorOpen() { return doorT; },
    slotFor,
    /** Everything a camera needs to frame the whole thing. */
    /* Everything a camera needs to frame the whole thing.
       openW is the width to frame when the door is OPEN: the leaf swings past
       the left wall, so framing the carcass alone cuts it off. */
    bounds: {
      w: D.outerW, h: D.outerH, d: D.outerD,
      cy: (D.outerH - D.reveal) / 2,
      openW: D.outerW + 2 * Math.abs(D.outerW * Math.cos(SWING)),
    },
    dispose() {
      for (const d of disposables) d.dispose?.();
      root.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) m?.dispose?.();
        }
      });
    },
  };

  setDoor(0);
  return root;
}
