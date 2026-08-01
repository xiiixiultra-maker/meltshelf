/**
 * auth.js — one Supabase client, and the handful of calls the site makes.
 *
 * Every page that needs an account imports THIS, never the vendor bundle, so
 * there is exactly one client, one session, and one place where a rule about
 * accounts can be written down.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE CANNOT DO, WHICH IS THE IMPORTANT PART
 *
 * Nothing here is a security boundary. It runs in the browser, on a static
 * host, from a public repo. Anyone can read it, edit it, or skip it and talk
 * to PostgREST directly with the same anon key.
 *
 * So `isAdmin()` below does not GRANT anything. It asks the database what it
 * already decided, in order to draw the right screen. If someone flips that
 * boolean in their own console, they get an admin screen whose every button
 * returns "not an admin" from Postgres, because approve_member() checks
 * is_admin() server side before it writes. The screen lies; the database
 * does not.
 *
 * That is the only arrangement that works without a server of our own, and
 * it is why the rules live in supabase/migrations rather than up here.
 */
import { SUPABASE, configured, SETUP_HELP } from './supabase-config.js';

/* The UMD bundle is loaded by a plain <script> before the module, so it has
   already set the global by the time this runs. Vendored rather than pulled
   from a CDN, like three and culori: a login screen that stops working
   because someone else's CDN is down is not a login screen. */
function lib() {
  const g = globalThis.supabase;
  if (!g?.createClient) {
    throw new Error('vendor/supabase/supabase.umd.js did not load before auth.js');
  }
  return g;
}

let _client = null;

/** The one client. Null when the project is not configured yet. */
export function db() {
  if (!configured()) return null;
  if (!_client) {
    _client = lib().createClient(SUPABASE.URL.replace(/\/$/, ''), SUPABASE.ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The code is typed into this tab, so there is no redirect to parse
        // and nothing useful in the URL. Leaving this on means a stray
        // access_token in a shared link would be honoured, which is a way to
        // hand someone your session by pasting a URL.
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

export { configured, SETUP_HELP };

/* ── signing in ───────────────────────────────────────────────────────── */

/**
 * Send a six digit code.
 *
 * A code, not a magic link, and the reason is mobile. A link opens in
 * whatever browser the mail app decides, usually its own in-app webview, so
 * the session lands THERE and the browser the person was actually using is
 * still signed out. A code typed into the tab they are already looking at
 * cannot do that.
 *
 * shouldCreateUser stays TRUE even though access is invite only. Refusing to
 * create the user would answer "does this address have an account here?" to
 * anyone who asks, which is an account-enumeration oracle. Instead everyone
 * gets an account and nobody unapproved gets any data: the profile lands with
 * approved = false and RLS returns nothing until an admin says otherwise.
 */
export async function sendCode(email) {
  const c = db();
  if (!c) throw new Error(SETUP_HELP);
  const { error } = await c.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Exchange the code for a session. */
export async function verifyCode(email, code) {
  const c = db();
  if (!c) throw new Error(SETUP_HELP);
  const { data, error } = await c.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.replace(/\D/g, ''),
    type: 'email',
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await db()?.auth.signOut();
}

export async function session() {
  const c = db();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session ?? null;
}

/* ── who am I ─────────────────────────────────────────────────────────── */

/**
 * The signed-in account's profile, or null.
 *
 * Returns null rather than throwing when there is no row yet: the trigger
 * that creates it fires on the auth user's insert, and on a brand new signup
 * the first read can land in the gap.
 */
export async function profile() {
  const c = db();
  if (!c) return null;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return null;
  const { data, error } = await c
    .from('profiles')
    .select('id, handle, display_name, approved, is_admin, premium, created_at, shelf_fx')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, email: user.email } : null;
}

/**
 * Save how the shelf is lit.
 *
 * shelf_fx is one of only three columns `authenticated` may write; approved,
 * is_admin and premium are not grantable to a session at all, so this cannot
 * be leaned on to change what an account is entitled to. The database also
 * caps the column's size, because a client-writable jsonb with no bound is
 * somewhere to park megabytes on someone else's disk.
 */
export async function saveShelfFx(fx) {
  const c = db();
  if (!c) return;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return;
  const { error } = await c.from('profiles').update({ shelf_fx: fx }).eq('id', user.id);
  if (error) throw error;
}

/** Where a signed-in account belongs right now. One place decides. */
export function routeFor(p) {
  if (!p) return './login.html';
  if (!p.approved) return './waiting.html';
  if (!p.handle) return './onboard.html';
  return './app.html';
}

/**
 * Guard a page. Redirects rather than rendering, and returns the profile so
 * the caller does not have to fetch it twice.
 *
 * `need` is what the PAGE wants to draw, not what the visitor is allowed to
 * do. Postgres decides the second one.
 */
export async function requireAccount(need = 'approved') {
  if (!configured()) { document.body.dataset.unconfigured = '1'; return null; }
  const p = await profile();
  const wanted = need === 'admin' ? (p?.is_admin ? null : './app.html')
    : need === 'approved' ? (p?.approved ? null : routeFor(p))
    : (p ? null : './login.html');
  if (wanted) { location.replace(wanted); return null; }
  return p;
}

/* ── handles ──────────────────────────────────────────────────────────── */

/**
 * Availability, asked with a token that is definitely still valid.
 *
 * handle_available is granted to anon as well as authenticated, so an expired
 * access token does not fail the call: it succeeds AS A STRANGER. Reserved
 * names are held for admins, so the one account allowed to take a reserved
 * handle is told it is taken, by a request that looked perfectly healthy.
 *
 * getSession refreshes an expired token before the RPC goes out, which is the
 * difference between asking as yourself and asking as nobody. Any RPC whose
 * answer depends on auth.uid() needs this; a plain read does not, because a
 * read with no session returns nothing and the failure is obvious.
 */
export async function handleAvailable(wanted) {
  const c = db();
  if (!c) return false;
  await c.auth.getSession();
  const { data, error } = await c.rpc('handle_available', { wanted });
  if (error) throw error;
  return !!data;
}

export async function claimHandle(wanted) {
  const c = db();
  if (!c) throw new Error(SETUP_HELP);
  const { data, error } = await c.rpc('claim_handle', { wanted });
  if (error) throw error;
  return data;
}

/* ── admin ────────────────────────────────────────────────────────────── */
/* These call functions that re-check is_admin() inside Postgres. Calling them
   without the role fails there, not here. */

/**
 * The account list, WITH email.
 *
 * Through a function rather than a table read, because a pending account has
 * no handle yet and email is the only thing identifying it. Email is not a
 * column on profiles on purpose: approved members can read each other's
 * profile rows and RLS cannot filter columns, so putting it there would hand
 * every member every address.
 */
export async function listMembers() {
  const c = db();
  const { data, error } = await c.rpc('admin_list_accounts');
  if (error) throw error;
  return data;
}

export async function listWaitlist() {
  const c = db();
  const { data, error } = await c
    .from('waitlist').select('email, created_at, note')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function approveMember(id, premium = false) {
  const c = db();
  const { data, error } = await c.rpc('approve_member', { target: id, grant_premium: premium });
  if (error) throw error;
  return data;
}

export async function revokeMember(id) {
  const c = db();
  const { data, error } = await c.rpc('revoke_member', { target: id });
  if (error) throw error;
  return data;
}
