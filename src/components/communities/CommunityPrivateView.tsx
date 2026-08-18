import Link from "next/link";

export function CommunityPrivateView({ name }: { name: string }) {
  return (
    <section className="py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/communities" className="hover:text-ink">
          Communities
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-wide text-ink md:text-6xl">
        {name}
      </h1>
      <p className="mt-6 max-w-xl text-muted">
        This community is private. You need an invite to join.
      </p>
    </section>
  );
}
