# Follow

Open follow between signed-in profiles. **Later than v1 launch** — do not implement on the launch branch. The follow graph is the actor set for the home feed and following-scoped trending. It is not community membership. See [activity-and-trending.md](./activity-and-trending.md) and [library.md](./library.md).

## Why

Communities are groups (ceremony + live board). Follow is 1:1 taste subscription: see someone’s **public** list and library activity without joining their community.

## Rules

- Signed-in profile required. Anonymous visitors cannot follow.
- Open follow — no request / approve.
- Store by `profile_id` (username changes do not break edges).
- Cannot follow yourself.
- **Cannot follow a private profile.** Private profile pages stay not-found for non-owners; there is no follow button around that.
- **Cannot follow seed accounts** on lasting production/staging, except **site operators**. Local and PR preview builds may follow them (and see them in Discover search). They stay omitted from public People search.
- No follow suggestions in the first slice.
- No block / mute in the first slice (later abuse work).
- No push / email / in-app notification that someone followed you. The feed is pull.

## Public graph

On a **public** profile:

- Follow / Following button for other signed-in people.
- **Counts** (following / followers) are public.
- **Rosters** (who they follow / who follows them) are public and SQL-paginated.

On a **private** profile: only the owner sees their own following list (and inbound follows, if any from before the profile was private). Non-owners cannot follow or browse the graph.

If a public profile later becomes private: existing follow edges remain in the table so the owner can still see who they follow; other people cannot start new follows, cannot see the profile, and those people drop out of **other viewers’** home feeds (followed actor is not publicly visible). Unfollow stays available to the follower from their own following list.

## Surfaces (when built)

- Profile header: Follow / Following
- Following and Followers lists (paged)
- Site nav: **People** when signed out (`/people`, username search only). **Following** when signed in (`/following`) with Activity first, then Trending (people you follow only), Following, Followers, and Discover people (same SQL search)
- `/following` grouped feed on the Activity tab when signed in — see [activity-and-trending.md](./activity-and-trending.md)
- Empty feed: point at public lists the visitor already uses, not a community firehose

Discover / People search is `ILIKE` on public living usernames and display names, hit-capped. Seed accounts are omitted. A blank query returns no rows.

## Schema (when built)

`profile_follows`: `(follower_profile_id, followed_profile_id)` primary key; `created_at`; indexes both directions.

Account close: delete edges where the tombstoned profile is follower or followed.

## Non-goals (this feature)

- Follow requests, close-friends, or per-follower list ACLs
- Suggestions / “people you may know”
- Block / mute (first slice)
- Messaging
- Community membership as implied follow
