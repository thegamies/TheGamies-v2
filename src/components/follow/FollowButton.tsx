"use client";

import { useState, useTransition } from "react";
import {
  followProfileAction,
  unfollowProfileAction,
} from "@/app/follow/actions";
import { Button } from "@/components/ui/Button";

export function FollowButton({
  username,
  initialFollowing,
  className = "mt-3",
}: {
  username: string;
  initialFollowing: boolean;
  className?: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      setMessage(null);
      const next = !following;
      setFollowing(next);
      const result = next
        ? await followProfileAction(username)
        : await unfollowProfileAction(username);
      if (result.error) {
        setFollowing(!next);
        setMessage(result.error);
      }
    });
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size="sm"
        variant={following ? "bordered" : "accent"}
        disabled={pending}
        onClick={toggle}
      >
        {following ? "Following" : "Follow"}
      </Button>
      {message ? (
        <p className="mt-2 text-sm text-accent" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
