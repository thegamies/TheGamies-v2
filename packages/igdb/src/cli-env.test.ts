import { describe, expect, it } from "vitest";
import { requireDopplerCli } from "./cli-env";

describe("requireDopplerCli", () => {
  it("returns the Doppler config name", () => {
    expect(requireDopplerCli({ DOPPLER_CONFIG: "dev_personal" })).toBe(
      "dev_personal",
    );
  });

  it("rejects a process that is not under Doppler", () => {
    expect(() => requireDopplerCli({})).toThrow(/must run under Doppler/);
  });
});
