import { describe, expect, it } from "vitest";
import {
  COMMUNITY_HOSTS_MAX,
  communityHostsAtCapacityMessage,
  communityHostsCapacityError,
} from "./host-limits";

describe("communityHostsCapacityError", () => {
  it("allows adds under the cap", () => {
    expect(communityHostsCapacityError(0, false)).toBeNull();
    expect(communityHostsCapacityError(COMMUNITY_HOSTS_MAX - 1, false)).toBeNull();
  });

  it("blocks adds at the cap", () => {
    expect(communityHostsCapacityError(COMMUNITY_HOSTS_MAX, false)).toBe(
      communityHostsAtCapacityMessage(),
    );
  });

  it("allows no-op when already on the roster", () => {
    expect(
      communityHostsCapacityError(COMMUNITY_HOSTS_MAX, true),
    ).toBeNull();
  });
});
