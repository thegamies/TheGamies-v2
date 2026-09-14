import { revalidatePath } from "next/cache";
import { siteGotyRevalidatePaths } from "@/lib/live-aggregate/award-category-defs";

export function revalidateSiteGotyYear(year: number) {
  for (const path of siteGotyRevalidatePaths(year)) {
    revalidatePath(path);
  }
}
