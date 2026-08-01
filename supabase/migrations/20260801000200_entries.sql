-- 002_entries.sql — the jars themselves.
--
-- Run after 001_auth.sql.
--
-- ─────────────────────────────────────────────────────────────────────────
-- THE ONE RULE THIS FILE EXISTS TO ENFORCE
--
-- `entries` is PRIVATE. Full stop. There is no public policy on it and there
-- never will be. Public reads go through `public_entries`, a view with a
-- HARD-CODED column list, so every new column is a decision somebody has to
-- make on purpose rather than a leak that happens by default.
--
-- That is not a style preference, it is the exact bug 002_rls_fix.sql closed
-- on the Hash Journal schema. An `is_public` flag with a row policy published
-- notes, price, vendor and batch code alongside the strain name, because
-- Postgres RLS is ROW level and cannot filter columns. The fix was a
-- projection. This table is built with the fix already in place.
-- ─────────────────────────────────────────────────────────────────────────

create type provenance_tier as enum ('in_hand', 'uploaded', 'declared');
create type shelf_kind      as enum ('rotation', 'wishlist', 'prototype');

-- How the label was obtained, which is a DIFFERENT question from provenance.
-- Six photographs of a jar and a peeled label shot in session both say you
-- had the jar. A label file says somebody has the artwork. The capture screen
-- grades an entry at its weakest part; this column records which part.
create type label_source    as enum ('photographed', 'peeled', 'artwork');

create table entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,

  name         text not null check (char_length(name) between 1 and 80),
  strain       text check (char_length(strain) <= 120),
  brand        text check (char_length(brand)  <= 80),

  bay          shelf_kind      not null default 'rotation',
  provenance   provenance_tier not null default 'declared',
  label_src    label_source,

  -- color_captured is what the camera gave and is NEVER overwritten. The
  -- delta between the two is what makes the disclosure meaningful, so the
  -- original has to survive the edit.
  color_captured text check (color_captured ~ '^#[0-9A-Fa-f]{6}$'),
  color_display  text check (color_display  ~ '^#[0-9A-Fa-f]{6}$'),
  wb_normalised  boolean not null default false,

  is_prototype boolean not null default false,
  listed       boolean not null default false,   -- appears on discover

  -- PRIVATE, and deliberately never projected. A session id is a correlation
  -- handle and an exact capture time says where somebody was and when.
  capture_session uuid,
  captured_at     timestamptz,

  notes        text,
  spec         jsonb not null default '{}'::jsonb,

  created_at   timestamptz not null default now(),

  -- A prototype never existed, so it cannot have been in anyone's hand.
  constraint prototype_has_no_provenance
    check (not is_prototype or provenance = 'declared')
);

create index entries_user_idx on entries (user_id, created_at desc);

alter table entries enable row level security;

-- ── the ONLY policies on entries: yours, and only yours ─────────────────
drop policy if exists "own entries read"   on entries;
drop policy if exists "own entries write"  on entries;
drop policy if exists "own entries update" on entries;
drop policy if exists "own entries delete" on entries;

create policy "own entries read"   on entries for select using (user_id = auth.uid());
create policy "own entries write"  on entries for insert with check (user_id = auth.uid() and is_approved());
create policy "own entries update" on entries for update using (user_id = auth.uid())
                                                  with check (user_id = auth.uid());
create policy "own entries delete" on entries for delete using (user_id = auth.uid());

revoke all on entries from anon, authenticated;
grant select, insert, update, delete on entries to authenticated;
-- anon gets nothing at all. Not a narrower grant: nothing.

-- ── the public projection ───────────────────────────────────────────────
-- security_invoker = false on purpose: the view runs as its owner so it can
-- read a table the caller cannot, which is the entire point of a projection.
-- Its column list is the contract.
create or replace view public_entries with (security_invoker = false) as
  select
    e.id,
    p.handle,
    p.display_name,
    e.name,
    e.strain,
    e.brand,
    e.bay,
    e.provenance,
    e.label_src,
    e.color_captured,
    e.color_display,
    e.wb_normalised,
    e.created_at
  from entries e
  join profiles p on p.id = e.user_id
 where e.listed
   and p.approved
   -- Quarantine, enforced here rather than in the UI. No client bug can put a
   -- prototype into browse because the projection never emits one.
   and not e.is_prototype
   -- A wish list is a shopping list and says a great deal about someone.
   and e.bay <> 'wishlist';

comment on view public_entries is
  'Public projection of entries. Hard-coded column list. Omits user_id, notes, '
  'spec, capture_session, captured_at, listed and is_prototype.';

grant select on public_entries to anon, authenticated;

-- ── the guard that makes the contract self-enforcing ────────────────────
-- Fails loudly if anyone ever widens the projection to include a column that
-- was withheld on purpose. Call it from verify_auth.sql or a deploy check.
create or replace function assert_public_projection_is_narrow()
returns void
language plpgsql
as $$
declare
  leaked text;
begin
  select string_agg(column_name, ', ')
    into leaked
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'public_entries'
     and column_name in ('user_id', 'notes', 'spec', 'capture_session',
                         'captured_at', 'listed', 'is_prototype');
  if leaked is not null then
    raise exception 'public_entries leaks private columns: %', leaked;
  end if;
end;
$$;

select assert_public_projection_is_narrow();
