import { describe, expect, it } from "vitest";
import {
  isSeedAuthUserId,
  seedProfileCreateFields,
} from "./seed-accounts";

describe("seed account flag", () => {
  it("treats seed auth ids as synthetic", () => {
    expect(isSeedAuthUserId("seed:community:0001")).toBe(true);
    expect(isSeedAuthUserId("seed:standings:0002")).toBe(true);
    expect(isSeedAuthUserId("user_abc")).toBe(false);
  });

  it("marks new seed profile rows", () => {
    expect(seedProfileCreateFields()).toEqual({ isSeed: true });
  });
});
