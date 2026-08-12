import { redirect } from "next/navigation";

export default function GameOfTheYearIndexPage() {
  redirect(`/game-of-the-year/${new Date().getUTCFullYear()}`);
}
