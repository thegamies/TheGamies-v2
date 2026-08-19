/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import {
  clearPostAuthNext,
  POST_AUTH_NEXT_COOKIE,
  readPostAuthNext,
  rememberPostAuthNext,
} from "./post-auth-next";

afterEach(() => {
  clearPostAuthNext();
});

describe("post-auth next cookie", () => {
  it("stores a safe return path", () => {
    rememberPostAuthNext("/create/goty?year=2026&intent=save");
    expect(readPostAuthNext()).toBe("/create/goty?year=2026&intent=save");
    expect(document.cookie).toContain(POST_AUTH_NEXT_COOKIE);
  });

  it("rejects open redirects", () => {
    rememberPostAuthNext("https://evil.example");
    expect(readPostAuthNext()).toBeNull();
  });
});
