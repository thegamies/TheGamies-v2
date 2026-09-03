import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TGA_2025_NOMINEES } from "./nominee-seed";
import {
  TGA_2025_OTHER_IMAGES,
  tga2025OtherImageFile,
} from "./other-image-seed";
import { detectTgaNomineeImageKind } from "./nominee-image";

describe("2025 other-nominee portraits", () => {
  it("covers every text nominee on the 2025 slate", () => {
    const others: string[] = [];
    for (const nominees of Object.values(TGA_2025_NOMINEES)) {
      for (const nominee of nominees) {
        if (nominee.type === "other") others.push(nominee.name);
      }
    }
    expect(others).toHaveLength(Object.keys(TGA_2025_OTHER_IMAGES).length);
    for (const name of others) {
      expect(tga2025OtherImageFile(name), name).toBeTruthy();
    }
  });

  it("keeps a stored file for every mapped portrait", () => {
    for (const filename of Object.values(TGA_2025_OTHER_IMAGES)) {
      expect(
        existsSync(join(process.cwd(), "public", "tga-seed", "2025", filename)),
        filename,
      ).toBe(true);
    }
  });

  it("detects jpeg and png payloads", () => {
    expect(
      detectTgaNomineeImageKind(new Uint8Array([0xff, 0xd8, 0xff]).buffer)?.ext,
    ).toBe("jpg");
    expect(
      detectTgaNomineeImageKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)
        ?.ext,
    ).toBe("png");
    expect(detectTgaNomineeImageKind(new Uint8Array([0x00, 0x01]).buffer)).toBe(
      null,
    );
  });
});
