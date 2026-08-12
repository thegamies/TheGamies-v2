import { describe, expect, it } from "vitest";
import { editionVoicesWriteBlockedReason } from "./voices";

describe("editionVoicesWriteBlockedReason", () => {
  it("blocks only after publish", () => {
    expect(editionVoicesWriteBlockedReason("draft")).toBeNull();
    expect(editionVoicesWriteBlockedReason("scheduled")).toBeNull();
    expect(editionVoicesWriteBlockedReason("open")).toBeNull();
    expect(editionVoicesWriteBlockedReason("closed")).toBeNull();
    expect(editionVoicesWriteBlockedReason("published")).toMatch(/locked/i);
  });
});
