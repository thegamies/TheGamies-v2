export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--page-pad-y)] pb-24 lg:pb-10">
      {children}
    </main>
  );
}
