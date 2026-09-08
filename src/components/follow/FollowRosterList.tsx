"use client";

import { useTransition } from "react";
import { unfollowProfileAction } from "@/app/follow/actions";
import { PersonIdentity } from "@/components/profile/PersonIdentity";
import { Button } from "@/components/ui/Button";
import type { FollowRosterPerson } from "@/lib/follow/service";

export function FollowRosterList({
  people,
  canUnfollow,
}: {
  people: FollowRosterPerson[];
  canUnfollow?: boolean;
}) {
  if (people.length === 0) {
    return <p className="mt-6 text-muted">No one here yet.</p>;
  }

  return (
    <ul className="mt-6 divide-y divide-line border-y border-line">
      {people.map((person) => (
        <FollowRosterRow
          key={person.id}
          person={person}
          canUnfollow={canUnfollow}
        />
      ))}
    </ul>
  );
}

function FollowRosterRow({
  person,
  canUnfollow,
}: {
  person: FollowRosterPerson;
  canUnfollow?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const publicProfile = person.visibility === "public";

  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <PersonIdentity
        displayName={person.displayName}
        username={person.username}
        avatarUrl={person.avatarUrl}
        href={publicProfile ? `/u/${person.username}` : undefined}
      />
      {canUnfollow ? (
        <Button
          type="button"
          size="sm"
          variant="bordered"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await unfollowProfileAction(person.username);
            })
          }
        >
          Unfollow
        </Button>
      ) : null}
    </li>
  );
}
