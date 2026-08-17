import Link from "next/link";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";
import { profileHref, type ProfileTab } from "@/lib/profile/profile-page";

export function ProfileTabs({
  username,
  tab,
}: {
  username: string;
  tab: ProfileTab;
}) {
  return (
    <ScrollableNav aria-label="Profile" className="mt-10">
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
    </ScrollableNav>
  );
}
