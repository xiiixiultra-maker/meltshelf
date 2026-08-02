/**
 * shelfFx.js — the trim lights and the smoke, as one thing both shelves use.
 *
 * WHY THIS IS A MODULE AND NOT A COPY
 * There are two shelves: shelf.html, the public demo, and app.html, the one
 * an account actually owns. They have to light identically, because the whole
 * promise is that what you set up is what a visitor sees. Twice today a bug
 * has been two implementations of one rule disagreeing with each other, so
 * this is one implementation with two callers.
 *
 * THE PART WORTH READING
 * One definition drives three things that must never disagree: the colour of
 * the strip, the colour of the light it spills onto the jars, and the tint the
 * smoke picks up as it drifts through that light. All three call trimColourAt.
 * Smoke lit by a rainbow trim reads as smoke; grey sprites over a coloured
 * shelf read as dirt on the lens.
 */

/**
 * @param {object}  o
 * @param {THREE}   o.THREE     the module, passed in so this file imports nothing
 * @param {Group}   o.scene
 * @param {number} [o.width]    strip length, matches the plank
 * @param {number} [o.x]        strip centre
 * @param {number} [o.z]        the plank's front lip
 */
export function createShelfFx({ THREE, scene, width = 560, x = -34, z = 66.5 }) {
  /* ── trim ──────────────────────────────────────────────────────────── */
  const TRIM = { mode: 'off', solid: '#51EC43', a: '#51EC43', b: '#FF7A18',
                 speed: 0.30, glow: 0.70, phase: 0 };

  const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _out = new THREE.Color();

  /** Colour at position t along the shelf, 0 to 1. The single source. */
  function trimColourAt(t) {
    if (TRIM.mode === 'solid') return _out.set(TRIM.solid);
    if (TRIM.mode === 'gradient') {
      _c1.set(TRIM.a); _c2.set(TRIM.b);
      return _out.copy(_c1).lerp(_c2, t);
    }
    if (TRIM.mode === 'rainbow') {
      return _out.setHSL((((t * 0.85 + TRIM.phase) % 1) + 1) % 1, 0.85, 0.55);
    }
    return _out.set('#000000');
  }

  const stripCv = document.createElement('canvas');
  stripCv.width = 256; stripCv.height = 1;
  const stripCtx = stripCv.getContext('2d');
  const stripTex = new THREE.CanvasTexture(stripCv);
  stripTex.colorSpace = THREE.SRGBColorSpace;

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(width, 2.4, 1.2),
    // toneMapped false: this is a light source, not a lit surface. Tone
    // mapping it would drag the bright colours back toward the scene's
    // exposure and the strip would read as painted plastic.
    new THREE.MeshBasicMaterial({ map: stripTex, toneMapped: false }),
  );
  strip.position.set(x, 1.7, z);
  strip.visible = false;
  scene.add(strip);

  /* Spill lights sample the SAME function as the strip, so a rainbow trim
     throws rainbow light onto the jars instead of merely glowing at them. */
  const SPILL = [];
  for (let i = 0; i < 9; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 230, 2);
    l.position.set(x - width / 2 + (i + 0.5) * (width / 9), 10, z - 8);
    l.visible = false;
    scene.add(l);
    SPILL.push(l);
  }

  function paintTrim() {
    const on = TRIM.mode !== 'off';
    strip.visible = on;
    for (const l of SPILL) l.visible = on;
    if (!on) return;
    for (let i = 0; i < stripCv.width; i++) {
      const c = trimColourAt(i / (stripCv.width - 1));
      stripCtx.fillStyle = '#' + c.getHexString();
      stripCtx.fillRect(i, 0, 1, 1);
    }
    stripTex.needsUpdate = true;
    SPILL.forEach((l, i) => {
      l.color.copy(trimColourAt((i + 0.5) / SPILL.length));
      l.intensity = 28 * TRIM.glow;
    });
  }

  /* ── smoke ─────────────────────────────────────────────────────────── */
  function puffTexture() {
    const S = 128, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,0.42)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.16)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    /* break the perfect circle up, or it reads as bokeh rather than smoke */
    const img = c.getImageData(0, 0, S, S), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % S, py = Math.floor(i / 4 / S);
      const n = Math.sin(px * 0.21) * Math.cos(py * 0.17) + Math.sin((px + py) * 0.09);
      d[i + 3] = Math.max(0, Math.min(255, d[i + 3] * (0.62 + n * 0.30)));
    }
    c.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(cv);
  }

  const SMOKE = { on: false, amount: 0.55, puffs: [] };
  const puffTex = puffTexture();
  const smokeGroup = new THREE.Group();
  smokeGroup.visible = false;
  scene.add(smokeGroup);
  const GREY = new THREE.Color(0xBFC6CE);

  for (let i = 0; i < 54; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({
      map: puffTex, transparent: true, depthWrite: false,
      opacity: 0, color: 0xBFC6CE, toneMapped: false,
    }));
    const reset = (initial) => {
      m.userData.x = x + (Math.random() - 0.5) * (width * 0.93);
      m.userData.y = initial ? Math.random() * 90 : -6 + Math.random() * 12;
      m.userData.z = (Math.random() - 0.5) * 90;
      m.userData.vy = 3.5 + Math.random() * 7;
      m.userData.drift = (Math.random() - 0.5) * 4;
      // Staggered on the first fill only. Without it all 54 puffs are born
      // together and the shelf breathes in unison, which reads as a pulse.
      m.userData.life = initial ? Math.random() * 8 : 0;
      m.userData.span = 7 + Math.random() * 9;
      m.userData.size = 42 + Math.random() * 76;
    };
    reset(true);
    m.userData.reset = reset;
    smokeGroup.add(m);
    SMOKE.puffs.push(m);
  }

  /** Advance the clock-driven parts. Call once per frame with real seconds. */
  function step(dt) {
    if (TRIM.mode === 'rainbow' && TRIM.glow > 0.001) {
      TRIM.phase = (TRIM.phase + dt * TRIM.speed * 0.35) % 1;
      paintTrim();
    }
    smokeGroup.visible = SMOKE.on;
    if (!SMOKE.on) return;
    for (const m of SMOKE.puffs) {
      const u = m.userData;
      u.life += dt;
      if (u.life > u.span) u.reset(false);
      u.y += u.vy * dt;
      u.x += u.drift * dt;
      const t = u.life / u.span;
      m.position.set(u.x, u.y, u.z);
      m.scale.setScalar(u.size * (0.7 + t * 0.8));
      m.material.opacity = Math.sin(Math.min(1, t) * Math.PI) * 0.30 * SMOKE.amount;
      if (TRIM.mode !== 'off') {
        const tx = (u.x - (x - width / 2)) / width;
        m.material.color.copy(trimColourAt(Math.max(0, Math.min(1, tx)))).lerp(GREY, 0.55);
      } else {
        m.material.color.copy(GREY);
      }
    }
  }

  /* ── the shape that gets saved ─────────────────────────────────────── */

  /** Everything needed to restore this look, and nothing else. */
  function toJSON() {
    return { mode: TRIM.mode, solid: TRIM.solid, a: TRIM.a, b: TRIM.b,
             speed: +TRIM.speed.toFixed(3), glow: +TRIM.glow.toFixed(3),
             smoke: SMOKE.on, smokeAmount: +SMOKE.amount.toFixed(3) };
  }

  const MODES = ['off', 'solid', 'gradient', 'rainbow'];
  const hex = (v, fallback) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
  const num = (v, lo, hi, fallback) =>
    (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

  /**
   * Restore a saved look, defensively.
   *
   * Every field is validated because this arrives from the database, and the
   * row is one a member is allowed to write. A hostile value should produce a
   * boring shelf, never a crash and never a colour string injected anywhere.
   */
  function fromJSON(o) {
    if (!o || typeof o !== 'object') return;
    TRIM.mode  = MODES.includes(o.mode) ? o.mode : 'off';
    TRIM.solid = hex(o.solid, '#51EC43');
    TRIM.a     = hex(o.a, '#51EC43');
    TRIM.b     = hex(o.b, '#FF7A18');
    TRIM.speed = num(o.speed, 0, 1, 0.30);
    TRIM.glow  = num(o.glow, 0, 1, 0.70);
    SMOKE.on   = !!o.smoke;
    SMOKE.amount = num(o.smokeAmount, 0, 1, 0.55);
    paintTrim();
  }

  /**
   * Re-cut the trim to a shelf that changed length.
   *
   * The plank is no longer a fixed 560: it is cut to however many jars are on
   * it. A trim strip that stayed its original width would hang off the end of
   * a short shelf and stop short of a long one, and the spill lights would
   * light the wrong stretch of plank.
   *
   * The strip is one box and nine lights, so this rebuilds rather than
   * scales: scaling a box scales its UVs with it, and the gradient would
   * stretch instead of spanning.
   */
  function resize(newWidth, newX = x) {
    if (!(newWidth > 0)) return;
    width = newWidth; x = newX;
    strip.geometry.dispose();
    strip.geometry = new THREE.BoxGeometry(width, 2.4, 1.2);
    strip.position.set(x, 1.7, z);
    SPILL.forEach((l, i) => {
      l.position.set(x - width / 2 + (i + 0.5) * (width / SPILL.length), 10, z - 8);
    });
    paintTrim();
  }

  return { TRIM, SMOKE, trimColourAt, paintTrim, step, toJSON, fromJSON,
           strip, SPILL, resize };
}
