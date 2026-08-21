"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOutAction } from "@/app/auth/sign-out/actions";
import { Button } from "@/components/ui/Button";
import type { SiteAccountMenuGroup } from "@/lib/site-nav";

export function SiteAccountMenu({
  label,
  groups,
}: {
  label: string;
  groups: SiteAccountMenuGroup[];
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-3 w-56 border border-line bg-paper py-1"
        >
          {groups.map((group, index) => (
            <div
              key={group.id}
              className={index > 0 ? "border-t border-line" : undefined}
            >
              {group.items.map((item) => (
                <Link
                  key={`${group.id}-${item.href}-${item.label}`}
                  href={item.href}
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm tracking-wide text-muted transition-colors hover:text-ink"
                  onClick={close}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <form action={signOutAction} className="border-t border-line">
            <Button
              type="submit"
              variant="quiet"
              role="menuitem"
              className="w-full justify-start px-4 py-2.5 text-sm"
            >
              Sign out
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      aria-hidden="true"
      className={open ? "rotate-180" : undefined}
    >
      <path
        d="M1 1l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}
