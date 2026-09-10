"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { FEATURED_COMMUNITIES_LIMIT } from "@/lib/communities/schema";
import type { CommunityDirectoryFlags } from "@/lib/communities/service";
import {
  loadCommunityDirectoryAction,
  loadFeaturedCommunitiesAction,
  saveCommunityDirectoryAction,
} from "./actions";

type Props = {
  initialFeatured: CommunityDirectoryFlags[];
};

export function AdminCommunityDirectoryClient({ initialFeatured }: Props) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [featured, setFeatured] = useState(false);
  const [joinsClosed, setJoinsClosed] = useState(false);
  const [featuredList, setFeaturedList] = useState(initialFeatured);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyFlags(flags: CommunityDirectoryFlags) {
    setSlug(flags.slug);
    setName(flags.name);
    setVisibility(flags.visibility);
    setFeatured(flags.featured);
    setJoinsClosed(flags.joinsClosed);
  }

  function load() {
    setMessage(null);
    startTransition(async () => {
      const result = await loadCommunityDirectoryAction({
        communitySlug: slug,
      });
      if ("error" in result) {
        setMessage(result.error);
        setName(null);
        return;
      }
      applyFlags(result.flags);
      setMessage(`Loaded ${result.flags.name}.`);
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCommunityDirectoryAction({
        communitySlug: slug,
        featured,
        joinsClosed,
        visibility,
      });
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      applyFlags(result.flags);
      const listed = await loadFeaturedCommunitiesAction();
      if ("featured" in listed) setFeaturedList(listed.featured);
      setMessage(`Saved ${result.flags.name}.`);
    });
  }

  return (
    <div className="max-w-xl space-y-8">
      <p className="text-sm text-muted">
        Feature a public community on the Communities page, and optionally close
        joins so nobody can join — including with an invite. Existing members
        stay. Up to {FEATURED_COMMUNITIES_LIMIT} featured communities.
      </p>

      {featuredList.length > 0 ? (
        <ul className="space-y-2 text-sm text-muted">
          {featuredList.map((row) => (
            <li key={row.slug}>
              <button
                type="button"
                className="text-left text-ink underline-offset-2 hover:underline"
                disabled={pending}
                onClick={() => applyFlags(row)}
              >
                {row.name}
              </button>
              <span>
                {" "}
                /{row.slug}
                {row.joinsClosed ? " · joins closed" : ""}
                {row.visibility === "private" ? " · private" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No featured communities yet.</p>
      )}

      <div className="space-y-4">
        <label className="block text-sm text-muted">
          Community slug
          <input
            className={`${fieldInputClass} mt-1`}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="kinda_funny"
            disabled={pending}
          />
        </label>
        {name ? (
          <p className="text-sm text-ink">{name}</p>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={visibility === "public"}
            onChange={(e) => {
              const next = e.target.checked ? "public" : "private";
              setVisibility(next);
              if (next === "private") setFeatured(false);
            }}
            disabled={pending}
          />
          Public
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => {
              const on = e.target.checked;
              setFeatured(on);
              if (on) setVisibility("public");
            }}
            disabled={pending}
          />
          Feature on the Communities page
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={joinsClosed}
            onChange={(e) => setJoinsClosed(e.target.checked)}
            disabled={pending}
          />
          Close joins (nobody can join)
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="bordered" disabled={pending} onClick={load}>
          Load community
        </Button>
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save directory flags"}
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
