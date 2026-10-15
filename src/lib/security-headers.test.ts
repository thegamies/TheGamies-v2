import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { SECURITY_HEADERS } from "./security-headers";

function header(key: string): string | undefined {
  return SECURITY_HEADERS.find((h) => h.key === key)?.value;
}

describe("SECURITY_HEADERS", () => {
  it("forbids framing in both header forms", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("keeps the CSP structural so third-party scripts are never blocked", () => {
    const csp = header("Content-Security-Policy") ?? "";
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/script-src|default-src|connect-src|img-src|frame-src/);
  });

  it("sets HSTS for this host only, without preload", () => {
    const hsts = header("Strict-Transport-Security") ?? "";
    expect(hsts).toBe("max-age=31536000");
    expect(hsts).not.toContain("includeSubDomains");
    expect(hsts).not.toContain("preload");
  });

  it("sets nosniff and the referrer policy", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("is applied to every path by next.config", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toEqual([
      { source: "/:path*", headers: [...SECURITY_HEADERS] },
    ]);
  });
});
