/** Shared create-flow masthead — shown until the list editor is open. */
export function CreatePageHeader() {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
        New list
      </p>
      <h1 className="mt-3 font-display text-5xl tracking-wide text-ink md:text-6xl">
        Build a list<span className="text-accent">.</span>
      </h1>
      <p className="mt-3 font-serif text-muted">
        Pick GOTY or a custom list, search and rank games, then publish a
        shareable page. Drafts stay on this device so you can leave and come
        back.
      </p>
    </div>
  );
}
