"use client";

import { useState } from "react";
import { fieldInputClass } from "@/components/ui/controls";
import { Button } from "@/components/ui/Button";

export function AdminTgaGate({
  authorized: initiallyAuthorized,
  children,
  onUnlocked,
}: {
  authorized: boolean;
  children: React.ReactNode;
  onUnlocked?: () => void;
}) {
  const [authorized, setAuthorized] = useState(initiallyAuthorized);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (authorized) return children;

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage(null);
        const res = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ secret }),
        });
        if (!res.ok) {
          setMessage("Could not unlock admin controls.");
          return;
        }
        setAuthorized(true);
        onUnlocked?.();
      }}
      className="max-w-md space-y-4"
    >
      <p className="text-sm text-muted">
        Enter the admin unlock code to manage Video Game Awards Pick’em.
      </p>
      <input
        type="password"
        className={fieldInputClass}
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
        autoComplete="current-password"
      />
      <Button type="submit">Unlock</Button>
      {message ? (
        <p className="text-sm text-accent" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
