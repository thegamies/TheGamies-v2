# Terminology

Use these terms consistently in product UI and code.

### Community

A group that can host an awards event (podcast, streamer, Discord, site, friend group).

### Host

A member **Promoted** on the community Hosts roster (`community_hosts`). Open GOTY events and open pick’em years inherit that roster. Each year still has its own snapshot (`community_edition_voices`, `tga_community_hosts`) that can be edited by hand, including after close. Public UI uses **Host** / **Hosts**. Internal/code for that board stays **Voice** (`?mode=voices`).

### Admin

Someone who can manage a community (Settings, live rankings, events, other admins). Settings → Community uses **Admin** / **Admins**. Internal role is `admin`. Public member lists still show display names only.

### Site operator

Someone who can use site `/admin` (catalog, live rankings, Pick’em ops, seed). Stored as `profiles.is_site_admin`. Not a community Admin. Account menu **Admin** is only for operators.

### Community ballot

A ballot submitted by an eligible audience / community member.

### Host ballot

A ballot submitted by someone on the Hosts roster (internal: Voice ballot).

### Combined result

Final calculation combining Community and Host results per the event's scoring rules.

### Category

An award separate from the main ranked Game of the Year ballot (e.g. Best Multiplayer). May use single selection, multiple selection, or ranking depending on configuration.

### Event

Public name for a community’s yearly awards vote (internal/code: **edition**). Scheduled open / close / publish times; results stay hidden until publish, then freeze.

### Live Rankings

Public name for the optional ongoing community board from members’ signed-in lists (internal: live rankings). Independent of Events.

### Official Vote

Scheduled event with opening time, deadline, and final locked result. Public UI uses **Event**.

### Always-Live Aggregate

Ongoing community ranking derived from members' personal lists. Public UI uses **Live Rankings**.

### Video Game Awards Pick’em

Public name for the site (and optional community) pick’em that predicts the external Game Awards show. Not an Event. Events remain a community’s own yearly awards (`{year} Video Game Awards`). Code and URLs use `tga` / `/the-game-awards`.
