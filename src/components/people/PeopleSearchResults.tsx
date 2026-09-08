import { FollowButton } from "@/components/follow/FollowButton";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import { PEOPLE_SEARCH_LIMIT, type PeopleSearchHit } from "@/lib/people/search";

export function PeopleSearchResults({
  people,
  q,
  followedIds,
  showFollow,
}: {
  people: PeopleSearchHit[];
  q: string;
  followedIds?: ReadonlySet<string>;
  showFollow?: boolean;
}) {
  if (!q.trim()) {
    return (
      <p className="mt-10 max-w-xl text-muted">
        Search for a name or username. Results stay on this page — nothing is
        listed until you search.
      </p>
    );
  }

  if (people.length === 0) {
    return (
      <p className="mt-10 max-w-xl text-muted">
        No public profiles match that name.
      </p>
    );
  }

  return (
    <div>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {people.map((person) => (
          <li
            key={person.id}
            className="flex items-center justify-between gap-4 py-4"
          >
            <PersonIdentity
              displayName={person.displayName}
              username={person.username}
              avatarUrl={person.avatarUrl}
              href={`/u/${person.username}`}
            />
            {showFollow ? (
              <FollowButton
                username={person.username}
                initialFollowing={followedIds?.has(person.id) ?? false}
                className="mt-0"
              />
            ) : null}
          </li>
        ))}
      </ul>
      {people.length >= PEOPLE_SEARCH_LIMIT ? (
        <p className="mt-4 text-sm text-muted">
          Showing the first {PEOPLE_SEARCH_LIMIT} matches. Narrow the name to
          see others.
        </p>
      ) : null}
    </div>
  );
}
