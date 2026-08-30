import { redirect } from "next/navigation";
import { getPromotedTgaYear, listTgaYears } from "@/lib/tga-pickem/service";

export default async function TgaIndexPage() {
  const promoted = await getPromotedTgaYear().catch(() => null);
  if (promoted) redirect(`/the-game-awards/${promoted.year}`);
  const years = await listTgaYears().catch(() => []);
  const enabled = years.find((row) => row.enabled);
  if (enabled) redirect(`/the-game-awards/${enabled.year}`);
  redirect("/");
}
