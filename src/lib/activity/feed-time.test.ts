import { describe, expect, it } from "vitest";
import { formatFeedEventTime, formatFeedGameClock } from "./feed-time";

const now = new Date("2026-09-07T18:00:00.000");

describe("formatFeedEventTime", () => {
  it("uses relative copy for the last hour", () => {
    expect(formatFeedEventTime(new Date("2026-09-07T17:59:20.000"), now)).toBe(
      "Just now",
    );
    expect(formatFeedEventTime(new Date("2026-09-07T17:45:00.000"), now)).toBe(
      "15 minutes ago",
    );
    expect(formatFeedEventTime(new Date("2026-09-07T17:00:00.000"), now)).toBe(
      "1 hour ago",
    );
  });

  it("names yesterday and older calendar days with the clock", () => {
    expect(formatFeedEventTime(new Date("2026-09-06T16:12:00.000"), now)).toBe(
      "Yesterday, 4:12 PM",
    );
    expect(formatFeedEventTime(new Date("2026-09-03T09:05:00.000"), now)).toBe(
      "Sep 3, 9:05 AM",
    );
    expect(formatFeedEventTime(new Date("2025-12-31T21:00:00.000"), now)).toBe(
      "Dec 31, 2025, 9:00 PM",
    );
  });
});

describe("formatFeedGameClock", () => {
  it("prints the local clock for a game tick", () => {
    expect(formatFeedGameClock(new Date("2026-09-07T16:12:00.000"))).toBe(
      "4:12 PM",
    );
  });
});
