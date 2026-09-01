import { describe, expect, it, vi } from "vitest";

const getAuthOrNull = vi.fn(() => null);

vi.mock("@/lib/auth/server", () => ({
  getAuthOrNull: () => getAuthOrNull(),
}));

import { GET } from "./route";

describe("GET /api/auth/reset-password/:token", () => {
  it("keeps the path token unused on the reset form", async () => {
    const response = await GET(
      new Request(
        "https://thegamies-v2-develop.ecdm981.workers.dev/api/auth/reset-password/KFsLY2b9lHmTgsviFkbrS7gR?callbackURL=https%3A%2F%2Fthegamies-v2-develop.ecdm981.workers.dev%2Fauth%2Freset-password",
      ),
      { params: Promise.resolve({ path: ["reset-password", "KFsLY2b9lHmTgsviFkbrS7gR"] }) },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://thegamies-v2-develop.ecdm981.workers.dev/auth/reset-password?token=KFsLY2b9lHmTgsviFkbrS7gR",
    );
    expect(getAuthOrNull).not.toHaveBeenCalled();
  });
});
