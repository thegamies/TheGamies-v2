import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import {
  canClaimFirstSiteAdmin,
  isAdminAuthorized,
} from "@/lib/admin-auth";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (await isAdminAuthorized()) {
    return children;
  }

  const user = await getRequestSessionUser();
  if (user?.id) {
    const profile = await getRequestProfileByAuthUserId(user.id).catch(
      () => null,
    );
    if (!profile) {
      redirect("/account?next=/admin");
    }
  }

  if (await canClaimFirstSiteAdmin()) {
    return children;
  }

  notFound();
}
