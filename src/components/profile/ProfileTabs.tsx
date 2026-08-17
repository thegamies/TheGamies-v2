import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import { profileHref, type ProfileTab } from "@/lib/profile/profile-page";

export function ProfileTabs({
  username,
  tab,
}: {
  username: string;
  tab: ProfileTab;
}) {
  return (
    <nav
      className="mt-10 flex flex-wrap gap-5 border-b border-line"
      aria-label="Profile"
    >
      <Link
        href={profileHref(username, { tab: "lists" })}
        className={navItemClass("secondary", tab === "lists")}
      >
        Lists
      </Link>
      <Link
        href={profileHref(username, { tab: "communities" })}
        className={navItemClass("secondary", tab === "communities")}
      >
        Communities
      </Link>
    </nav>
  );
}
