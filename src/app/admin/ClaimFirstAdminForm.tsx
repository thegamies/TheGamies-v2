"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { claimFirstSiteAdminAction } from "./actions";

export function ClaimFirstAdminForm() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage(null);
        const result = await claimFirstSiteAdminAction(secret);
        setBusy(false);
        if ("error" in result && result.error) {
          setMessage(result.error);
          return;
        }
        router.refresh();
      }}
      className="max-w-md space-y-4"
    >
      <p className="text-sm text-muted">
        No site operators yet. Enter the admin code to become one. Community
        admins are separate.
      </p>
      <input
        type="password"
        className={fieldInputClass}
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
        autoComplete="current-password"
      />
      <Button type="submit" disabled={busy || secret.length < 1}>
        Continue
      </Button>
      {message ? (
        <p className="text-sm text-accent" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
