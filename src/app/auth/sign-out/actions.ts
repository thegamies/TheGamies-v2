"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  authCookieNamesToExpire,
  expireAuthCookies,
} from "@/lib/auth/session-cookies";

export async function signOutAction() {
  try {
    await auth.signOut();
  } catch {
    // The local session still has to be dropped below.
  }
  const jar = await cookies();
  expireAuthCookies(
    authCookieNamesToExpire((await headers()).get("cookie")),
    (name, value, options) => {
      jar.set(name, value, options);
    },
  );
  redirect("/");
}
