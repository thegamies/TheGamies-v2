import { describe, expect, it } from "vitest";
import {
  anonymizedVoterUsername,
  deletedAuthUserIdSentinel,
  FORMER_MEMBER_DISPLAY_NAME,
  isAnonymizedVoter,
  isDeletedProfile,
  lastHostAccountDeleteMessage,
  shouldKeepEditionBallot,
  tombstoneProfileFields,
  tombstoneUsername,
} from "./delete-account";

describe("tombstoneUsername", () => {
  it("fits the public username length and is unique per id", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const username = tombstoneUsername(id);
    expect(username.length).toBeLessThanOrEqual(24);
    expect(username).toMatch(/^[a-z0-9_]+$/);
    expect(tombstoneUsername("ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee")).not.toBe(
      username,
    );
  });
});

describe("anonymizedVoterUsername", () => {
  it("is opaque and stable for a profile", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    expect(anonymizedVoterUsername(id)).toMatch(/^former_[a-f0-9]+$/);
    expect(anonymizedVoterUsername(id)).toBe(anonymizedVoterUsername(id));
  });
});

describe("isAnonymizedVoter", () => {
  it("detects former-member roster rows", () => {
    expect(
      isAnonymizedVoter({
        displayName: FORMER_MEMBER_DISPLAY_NAME,
        username: "former_abc",
      }),
    ).toBe(true);
    expect(
      isAnonymizedVoter({ displayName: "Ada", username: "ada" }),
    ).toBe(false);
  });
});

describe("isDeletedProfile", () => {
  it("is true when deletedAt is set", () => {
    expect(isDeletedProfile({ deletedAt: new Date() })).toBe(true);
    expect(isDeletedProfile({ deletedAt: null })).toBe(false);
    expect(isDeletedProfile({})).toBe(false);
  });
});

describe("shouldKeepEditionBallot", () => {
  it("keeps closed and published ballots only", () => {
    expect(shouldKeepEditionBallot("closed")).toBe(true);
    expect(shouldKeepEditionBallot("published")).toBe(true);
    expect(shouldKeepEditionBallot("open")).toBe(false);
    expect(shouldKeepEditionBallot("scheduled")).toBe(false);
    expect(shouldKeepEditionBallot("draft")).toBe(false);
  });
});

describe("lastHostAccountDeleteMessage", () => {
  it("is null when they are not the last host", () => {
    expect(lastHostAccountDeleteMessage([])).toBeNull();
  });

  it("names one community", () => {
    expect(lastHostAccountDeleteMessage(["Kinda Funny"])).toMatch(
      /Kinda Funny/,
    );
  });

  it("lists several communities", () => {
    const message = lastHostAccountDeleteMessage(["Alpha", "Beta"]);
    expect(message).toMatch(/Alpha/);
    expect(message).toMatch(/Beta/);
  });
});

describe("tombstoneProfileFields", () => {
  it("clears public identity", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const fields = tombstoneProfileFields(id, now);
    expect(fields.displayName).toBe(FORMER_MEMBER_DISPLAY_NAME);
    expect(fields.username).toBe(tombstoneUsername(id));
    expect(fields.bio).toBeNull();
    expect(fields.avatarUrl).toBeNull();
    expect(fields.socialLinks).toBeNull();
    expect(fields.visibility).toBe("private");
    expect(fields.authUserId).toBe(deletedAuthUserIdSentinel(id));
    expect(fields.deletedAt).toBe(now);
  });
});
