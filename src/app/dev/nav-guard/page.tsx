"use client";

import Link from "next/link";
import { useState } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

/** Dev/e2e fixture — same hook as ListEditor (in-app leave dialog). */
export default function NavGuardFixturePage() {
  const [dirty, setDirty] = useState(false);
  const { dialog } = useUnsavedChangesGuard(dirty);

  return (
    <div>
      <header className="border-b border-line px-8 py-4">
        <nav className="flex gap-5 text-sm">
          <Link href="/games" data-testid="header-games">
            Games
          </Link>
          <Link href="/create" data-testid="header-create">
            Create
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-lg space-y-6 p-8">
        <h1 className="font-display text-3xl">Nav guard fixture</h1>
        <p data-testid="status">{dirty ? "dirty" : "clean"}</p>
        <button
          type="button"
          data-testid="toggle-dirty"
          className="underline"
          onClick={() => setDirty((value) => !value)}
        >
          Toggle dirty
        </button>
        <p>
          <Link
            href="/"
            data-testid="leave-link"
            className="text-accent underline"
          >
            Leave to home
          </Link>
        </p>
      </main>
      {dialog}
    </div>
  );
}
