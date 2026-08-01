/**
 * supabase-config.js — the two values that point this site at your project.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FILL THESE IN
 *
 * Supabase dashboard -> Project Settings -> API. Copy:
 *
 *   Project URL   ->  URL below
 *   anon public   ->  ANON_KEY below
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IS IT SAFE THAT THESE ARE PUBLIC?
 *
 * Yes, and it is worth understanding why rather than taking it on trust,
 * because the answer is the whole reason the rest of the design holds up.
 *
 * The anon key is not a password. It identifies the PROJECT and grants the
 * `anon` Postgres role, nothing more. Every table it can reach is behind row
 * level security, so what it actually returns is decided by the policies in
 * supabase/migrations, evaluated by Postgres, on every single request. Point
 * a stranger's script at this key and they get exactly what a signed-out
 * visitor gets, because that is what the policies say.
 *
 * It is meant to ship in client code. Supabase publishes it for that purpose.
 *
 * THE KEY THAT MUST NEVER APPEAR HERE, or anywhere in this repo, is the
 * `service_role` key. That one bypasses RLS entirely by design, for trusted
 * server code. In a static site there is no trusted server, so there is no
 * legitimate place to put it. If you ever find yourself needing it in the
 * browser, the answer is a different design, not a hidden file: this repo is
 * public and everything in it is readable by anyone.
 */

export const SUPABASE = {
  URL: 'https://mmrugpbfpgscgtobfbmk.supabase.co',

  // The PUBLISHABLE key. Supabase renamed these: what the docs used to call
  // the "anon public" JWT is now an sb_publishable_ string, and its own
  // dashboard says "Publishable keys can be safely shared publicly".
  //
  // Its secret counterpart is sb_secret_. That one belongs on a server and
  // there is no server here, so it must never appear in this repo.
  ANON_KEY: 'sb_publishable_tPW0piFM5cQzvE7bljMlxw_x9sv5nJH',
};

/** True once the two values above are filled in. Accepts both key styles: the
 *  new sb_publishable_ strings and the older anon JWTs, which are still valid
 *  on projects created before the rename. */
export const configured = () => {
  const url = SUPABASE.URL.trim(), key = SUPABASE.ANON_KEY.trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) return false;
  return key.startsWith('sb_publishable_') || key.split('.').length === 3;
};

/** What to show when it is not, so a blank screen never has to be diagnosed. */
export const SETUP_HELP =
  'Supabase is not configured yet. Open src/supabase-config.js and paste the '
  + 'Project URL and the anon public key from Project Settings, API.';
