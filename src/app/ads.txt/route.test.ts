import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /ads.txt", () => {
  it("serves the Google seller line", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    await expect(response.text()).resolves.toContain(
      "google.com, pub-9835884276920090, DIRECT, f08c47fec0942fa0",
    );
  });
});
