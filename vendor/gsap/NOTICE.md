# GSAP, vendored

    gsap.min.js      GSAP 3.13.0, UMD build
    source           https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js
    fetched          2026-08-03
    size             72,435 bytes
    licence          Copyright 2025 GreenSock. Standard licence.
                     https://gsap.com/standard-license

## Why it is here and not on a CDN

Every other dependency on this site is vendored: three, supabase, culori. The
pages that need this one also carry a signed-in session, and a third party
script on a page like that can read anything the page can. Self hosting is one
fewer origin that has to stay trustworthy and one fewer thing that can change
under us without a deploy.

It is also pinned. A CDN reference without a version is a dependency that
updates itself on somebody else's schedule.

## What was checked before it was committed

    node --check gsap.min.js                       parses clean, file complete
    grep -E "fetch\(|XMLHttpRequest|WebSocket"     no matches

That last one is the one worth repeating if this is ever updated. GSAP makes no
network calls at runtime, so nothing about a member's shelf leaves the browser
through it. A future version that did would be a reason not to take the update.

## Updating

Fetch the same two URLs at the new version, re-run both checks above, and change
the version in this file. The bonus plugins (ScrollTrigger, SplitText and the
rest) are not here; add them the same way if something actually needs one, not
in advance.
