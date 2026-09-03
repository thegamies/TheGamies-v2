import { eq } from "drizzle-orm";
import { tgaNominees, type Db } from "@thegamies/db";
import { readR2AvatarConfigFromEnv } from "@/lib/profile/avatar-upload";
import { uploadTgaNomineeImageObject } from "./nominee-image";
import { readTga2025OtherImageBytes } from "./other-image-load";
import { tga2025OtherImageFile } from "./other-image-seed";

export async function attachTga2025OtherNomineeImages(
  year: number,
  db: Db,
): Promise<{ imagesUploaded: number; imageErrors: string[] }> {
  const config = readR2AvatarConfigFromEnv();
  const rows = await db
    .select({
      id: tgaNominees.id,
      displayName: tgaNominees.displayName,
    })
    .from(tgaNominees)
    .where(eq(tgaNominees.year, year));

  const imageErrors: string[] = [];
  let imagesUploaded = 0;
  let missingStorageNoted = false;

  for (const row of rows) {
    const filename = tga2025OtherImageFile(row.displayName);
    if (!filename) continue;
    if (!config) {
      if (!missingStorageNoted) {
        imageErrors.push("Portrait upload is not available right now.");
        missingStorageNoted = true;
      }
      continue;
    }
    const body = await readTga2025OtherImageBytes(filename);
    if (!body) {
      imageErrors.push(`${row.displayName}: missing portrait file`);
      continue;
    }
    try {
      const { imageUrl } = await uploadTgaNomineeImageObject(config, {
        year,
        nomineeId: row.id,
        body,
      });
      const [saved] = await db
        .update(tgaNominees)
        .set({ imageUrl })
        .where(eq(tgaNominees.id, row.id))
        .returning({ id: tgaNominees.id });
      if (!saved) {
        imageErrors.push(`${row.displayName}: Nominee not found.`);
        continue;
      }
      imagesUploaded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Photo could not be saved.";
      imageErrors.push(`${row.displayName}: ${message}`);
    }
  }

  return { imagesUploaded, imageErrors };
}
