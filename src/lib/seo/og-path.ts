export function ogImagePath(
  input:
    | { kind: "default" }
    | { kind: "game"; slug: string }
    | { kind: "profile"; username: string }
    | { kind: "list"; username: string; slug: string }
    | { kind: "goty"; year: number }
    | { kind: "community"; slug: string },
): string {
  if (input.kind === "default") return "/og.png";
  const params = new URLSearchParams({ kind: input.kind });
  if ("slug" in input && input.kind !== "list") {
    params.set("slug", input.slug);
  }
  if (input.kind === "list") {
    params.set("username", input.username);
    params.set("slug", input.slug);
  }
  if (input.kind === "profile") params.set("username", input.username);
  if (input.kind === "goty") params.set("year", String(input.year));
  return `/api/og?${params.toString()}`;
}
