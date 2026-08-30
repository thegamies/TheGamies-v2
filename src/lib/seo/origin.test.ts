import { describe, expect, it } from "vitest";
import { isLocalHost, normalizeOrigin } from "./origin";

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

describe("normalizeOrigin", () => {
  it("adds https for bare hostnames", () => {
    expect(normalizeOrigin("thegamies.gg")).toBe("https://thegamies.gg");
    expect(normalizeOrigin("thegamies.gg/")).toBe("https://thegamies.gg");
  });

  it("preserves http for loopback", () => {
    expect(normalizeOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("returns empty for blank or invalid input", () => {
    expect(normalizeOrigin("")).toBe("");
    expect(normalizeOrigin("   ")).toBe("");
    expect(normalizeOrigin("not a url ::")).toBe("");
  });
});
