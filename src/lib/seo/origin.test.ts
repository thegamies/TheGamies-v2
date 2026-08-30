import { describe, expect, it } from "vitest";
import { isLocalHost } from "./origin";

describe("isLocalHost", () => {
  it("treats loopback as local", () => {
    expect(isLocalHost("http://localhost:3000")).toBe(true);
    expect(isLocalHost("localhost:3000")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
  });

  it("treats public hosts as not local", () => {
    expect(isLocalHost("https://thegamies.gg")).toBe(false);
    expect(isLocalHost("thegamies-v2.example.workers.dev")).toBe(false);
  });
});
