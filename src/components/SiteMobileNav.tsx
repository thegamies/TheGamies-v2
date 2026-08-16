"use client";

import Link from "next/link";
import { Suspense, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOutAction } from "@/app/auth/sign-out/actions";
import { SignInLink } from "@/components/auth/SignInLink";
import { Button } from "@/components/ui/Button";
import type { SiteNavAccount, SiteNavLink } from "@/lib/site-nav";

type SiteMobileNavProps = {
  links: SiteNavLink[];
  account: SiteNavAccount;
};

export function SiteMobileNav({ links, account }: SiteMobileNavProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        buttonRef.current?.focus();
      }
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  const drawer = open
    ? createPortal(
        <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close menu"
            onClick={close}
          />
          <aside
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-[min(20rem,100%)] flex-col border-l border-line bg-paper"
          >
            <div className="flex items-center justify-between border-b border-line px-[var(--gutter)] py-4">
              <p
                id={titleId}
                className="font-display text-2xl tracking-wide text-ink"
              >
                Menu
              </p>
              <button
                ref={closeRef}
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center border border-line text-ink transition-colors hover:border-accent hover:text-accent"
                aria-label="Close menu"
                onClick={close}
              >
                <CloseIcon />
              </button>
            </div>
            <nav
              className="flex flex-1 flex-col overflow-y-auto px-[var(--gutter)] py-2"
              aria-label="Site"
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-b border-line py-4 text-base tracking-wide text-muted transition-colors hover:text-ink"
                  onClick={close}
                >
                  {link.label}
                </Link>
              ))}
              {account.status === "authenticated" ? (
                <>
                  <Link
                    href={account.profileHref}
                    className="border-b border-line py-4 text-base tracking-wide text-muted transition-colors hover:text-ink"
                    onClick={close}
                  >
                    {account.label}
                  </Link>
                  <Link
                    href="/account"
                    className="border-b border-line py-4 text-base tracking-wide text-muted transition-colors hover:text-ink"
                    onClick={close}
                  >
                    Settings
                  </Link>
                  <form action={signOutAction} className="border-b border-line py-4">
                    <Button
                      type="submit"
                      variant="quiet"
                      className="px-0 py-0 text-base"
                    >
                      Sign out
                    </Button>
                  </form>
                </>
              ) : (
                <Suspense
                  fallback={
                    <Link
                      href="/auth/sign-in"
                      className="border-b border-line py-4 text-base tracking-wide text-muted transition-colors hover:text-ink"
                      onClick={close}
                    >
                      Sign in
                    </Link>
                  }
                >
                  <SignInLink
                    className="border-b border-line py-4 text-base tracking-wide text-muted transition-colors hover:text-ink"
                    onClick={close}
                  />
                </Suspense>
              )}
            </nav>
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-line text-ink transition-colors hover:border-accent hover:text-accent lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      {drawer}
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 18 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 1h18M0 7h18M0 13h18"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 1l12 12M13 1L1 13"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
