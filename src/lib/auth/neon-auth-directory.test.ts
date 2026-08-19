import { describe, expect, it } from "vitest";
import { endpointIdFromDatabaseUrl } from "./neon-auth-directory";

describe("endpointIdFromDatabaseUrl", () => {
  it("reads the compute id from a Neon connection string", () => {
    expect(
      endpointIdFromDatabaseUrl(
        "postgresql://u:p@ep-rapid-snow-abc123.us-east-1.aws.neon.tech/neondb?sslmode=require",
      ),
    ).toBe("ep-rapid-snow-abc123");
  });

  it("strips the pooler suffix", () => {
    expect(
      endpointIdFromDatabaseUrl(
        "postgres://u:p@ep-rapid-snow-abc123-pooler.us-east-1.aws.neon.tech/neondb",
      ),
    ).toBe("ep-rapid-snow-abc123");
  });
});
