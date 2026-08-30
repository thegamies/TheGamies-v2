import { describe, expect, it } from "vitest";
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  communitiesIndexHref,
  communityHeaderInvitePath,
  generateInviteCode,
  inviteJoinPath,
  normalizeInviteCode,
  parseInviteCode,
} from "./invite-code";

describe("generateInviteCode", () => {
  it("uses the public alphabet and length", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect([...code].every((ch) => INVITE_CODE_ALPHABET.includes(ch))).toBe(
      true,
    );
  });
});

describe("parseInviteCode", () => {
  it("normalizes case and rejects junk", () => {
    expect(parseInviteCode("abcdefghjk")).toBe("ABCDEFGHJK");
    expect(parseInviteCode("  abcdefghjk  ")).toBe("ABCDEFGHJK");
    expect(parseInviteCode("short")).toBeNull();
    expect(parseInviteCode("ABCDEFGHJ0")).toBeNull();
    expect(parseInviteCode("not a code!!")).toBeNull();
  });
});

describe("invite paths", () => {
  it("builds the join path from a code", () => {
    expect(inviteJoinPath("abcdefghjk")).toBe("/communities/join/ABCDEFGHJK");
    expect(communityHeaderInvitePath(null)).toBeNull();
    expect(communityHeaderInvitePath("ABCDEFGHJK")).toBe(
      "/communities/join/ABCDEFGHJK",
    );
  });

  it("pages the memberships index", () => {
    expect(communitiesIndexHref()).toBe("/communities");
    expect(communitiesIndexHref(1)).toBe("/communities");
    expect(communitiesIndexHref(2)).toBe("/communities?page=2");
  });
});

describe("normalizeInviteCode", () => {
  it("strips separators", () => {
    expect(normalizeInviteCode("ab-cd ef")).toBe("ABCDEF");
  });
});
