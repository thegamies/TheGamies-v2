"use client";

export function ShareMenuDialog({
  open,
  signedIn = true,
  onShareAsImage,
  onShareWithLink,
}: {
  open: boolean;
  signedIn?: boolean;
  onShareAsImage: () => void;
  onShareWithLink: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="menu"
      aria-label="Share"
      className="absolute right-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] border border-line bg-panel p-2"
    >
      <button
        type="button"
        role="menuitem"
        className="w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-paper hover:text-accent"
        onClick={onShareAsImage}
      >
        Share as image
      </button>
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-paper hover:text-accent"
        onClick={onShareWithLink}
      >
        <span>Share with a link</span>
        {signedIn ? null : (
          <span className="shrink-0 text-xs text-muted">Sign in required</span>
        )}
      </button>
    </div>
  );
}
