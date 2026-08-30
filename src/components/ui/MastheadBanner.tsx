/**
 * Full-bleed masthead image with a tall bottom fade into the page surface
 * so more of the photo shows while still softening into the header.
 */
export function MastheadBanner({
  src,
  fadeTo = "panel",
  className = "",
}: {
  src: string;
  /** Match the surface under the banner. */
  fadeTo?: "panel" | "paper";
  className?: string;
}) {
  const fadeClass =
    fadeTo === "paper"
      ? "bg-gradient-to-b from-transparent from-0% via-paper/25 via-40% to-paper to-100%"
      : "bg-gradient-to-b from-transparent from-0% via-panel/25 via-40% to-panel to-100%";

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="aspect-[3/1] max-h-60 w-full object-cover sm:max-h-72"
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[70%] min-h-24 ${fadeClass}`}
        aria-hidden
      />
    </div>
  );
}
