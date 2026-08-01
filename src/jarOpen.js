/**
 * jarOpen.js — taking the lid off, and putting it somewhere sensible.
 *
 * WHY THE CAP NEEDS ITS OWN OPINION ABOUT WHERE TO GO
 * The jar model sets a removed cap down 58mm to the LEFT, every time. That is
 * right for a hero jar standing alone. On a shelf the jars are 68mm apart, so
 * "58mm left" is almost exactly the next jar along, and taking a lid off drops
 * it on its neighbour.
 *
 * The reach is kept, because that is what carries the cap clear of its own
 * jar. Only the DIRECTION is decided here, per jar, toward whichever side has
 * more room, plus a push forward onto the front of the plank. Both together
 * are what stop it landing on anything:
 *
 *     x 58 toward the open side  ->  42mm of x from a 100mm neighbour
 *     z 38 forward               ->  56mm centre to centre, clear of 51mm of radii
 *
 * The offset is decided in WORLD space and counter-rotated into the jar's
 * local frame, because every jar stands at a small random angle. Set as a
 * local offset it inherits that angle, and the first version put one cap 47mm
 * from the next jar instead of the 56 it was aiming for.
 *
 * The model keeps ownership of the lift, the tilt and the turn. This only
 * redirects the last part of the travel, after the thread has released.
 */

export const CAP_REST = { reach: 58, forward: 38 };
export const OPEN_T = 2.0;      // the runtime's "cap set aside" position
export const OPEN_MS = 900;

const ease = (t) => t * t * (3 - 2 * t);

/** Where this jar's cap should go, in the jar's own local frame. */
export function capRestFor(x, yaw, otherXs) {
  const others = otherXs.filter((v) => v !== x);
  // No neighbour on a side means unlimited room on that side.
  const gapL = Math.min(...others.filter((v) => v < x).map((v) => x - v), Infinity);
  const gapR = Math.min(...others.filter((v) => v > x).map((v) => v - x), Infinity);
  const wx = (gapR >= gapL ? 1 : -1) * CAP_REST.reach, wz = CAP_REST.forward;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: c * wx - s * wz, z: s * wx + c * wz };   // world -> local, about Y
}

/**
 * Record what a jar needs before it can be opened.
 * Call after the model is built and positioned, while the lid is still home.
 */
export function prepareJar(jar, otherXs) {
  jar.userData.lid = jar.getObjectByName('lid-assembly');
  if (jar.userData.lid) jar.userData.capHome = jar.userData.lid.position.clone();
  jar.userData.rest = capRestFor(jar.position.x, jar.rotation.y, otherXs);
}

/** Redirect the set-aside leg. setOpen writes x and z itself, so this
 *  overwrites rather than offsets, on the model's own easing curve. */
function placeCap(jar, v) {
  const lid = jar.userData.lid;
  if (!lid || !jar.userData.capHome) return;
  const free = Math.max(0, Math.min(1, v - 1));
  const e = ease(free);
  lid.position.x = jar.userData.capHome.x + e * jar.userData.rest.x;
  lid.position.z = jar.userData.capHome.z + e * jar.userData.rest.z;
}

/**
 * An opener for one shelf.
 *
 * Each jar owns its own rAF handle. With one shared handle, opening a second
 * jar cancelled the first one's tween mid-travel and left a cap floating at
 * whatever height it had reached.
 */
export function createOpener() {
  let openJar = null;

  function tween(jar, to) {
    if (!jar) return;
    const rt = jar.userData.sculptRuntime;
    if (!rt) return;
    cancelAnimationFrame(jar.userData.openAnim);
    const from = rt.openAmount ?? 0;
    if (Math.abs(to - from) < 0.001) return;
    const t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / OPEN_MS);
      const v = from + (to - from) * ease(k);
      rt.setOpen(v);
      placeCap(jar, v);
      if (k < 1) jar.userData.openAnim = requestAnimationFrame(step);
    })(performance.now());
  }

  return {
    isOpen: (jar) => !!jar?.userData.wantOpen,

    /** Open or close one jar. One at a time: two open jars on a shelf reads
     *  as a bug, and the cap you set down stops belonging to anything. */
    toggle(jar) {
      if (!jar) return false;
      const next = !jar.userData.wantOpen;
      if (next && openJar && openJar !== jar) {
        openJar.userData.wantOpen = false;
        tween(openJar, 0);
      }
      jar.userData.wantOpen = next;
      openJar = next ? jar : null;
      tween(jar, next ? OPEN_T : 0);
      return next;
    },

    /** Shut everything, without animating. For a tier change that removes a
     *  jar from the shelf while its lid is off. */
    closeAll(jars) {
      for (const j of jars) {
        cancelAnimationFrame(j.userData.openAnim);
        j.userData.wantOpen = false;
        j.userData.sculptRuntime?.setOpen(0);
        if (j.userData.capHome) j.userData.lid?.position.copy(j.userData.capHome);
      }
      openJar = null;
    },
  };
}
