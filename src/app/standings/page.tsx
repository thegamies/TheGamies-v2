import { permanentRedirect } from "next/navigation";

export default function StandingsRedirectPage() {
  permanentRedirect("/game-of-the-year");
}
