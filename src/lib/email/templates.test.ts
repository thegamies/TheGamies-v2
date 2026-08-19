import { describe, expect, it } from "vitest";
import { AUTH_EMAIL_SUBJECTS } from "./copy";
import { buildAuthEmail } from "./send";
import { expirySentence, renderRecoveryEmail } from "./templates";

describe("auth emails", () => {
  it("renders recovery HTML with the branded CTA", () => {
    const html = renderRecoveryEmail({
      href: "https://thegamies.gg/auth/reset-password?token=abc",
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    expect(html).toContain("Reset your password");
    expect(html).toContain("Reset password");
    expect(html).toContain("The Gamies");
    expect(html).not.toContain("thegamies-logo.png");
    expect(html).toContain("#ff5a1f");
    expect(html).toContain("This link is valid for 15 minutes.");
    expect(html).not.toContain("{{ .TokenHash }}");
  });

  it("maps password-reset magic links", () => {
    const message = buildAuthEmail({
      event_type: "send.magic_link",
      user: { email: "ada@example.com" },
      event_data: {
        link_type: "forget-password",
        link_url: "https://example.com/reset",
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      },
    });
    expect(message?.to).toBe("ada@example.com");
    expect(message?.subject).toBe(AUTH_EMAIL_SUBJECTS.recovery);
    expect(message?.html).toContain("https://example.com/reset");
    expect(message?.text).toContain("https://example.com/reset");
  });

  it("maps OTP codes for password reset", () => {
    const message = buildAuthEmail({
      event_type: "send.otp",
      user: { email: "ada@example.com" },
      event_data: {
        otp_type: "forget-password",
        otp_code: "123456",
      },
    });
    expect(message?.html).toContain("123456");
    expect(message?.text).toContain("123456");
  });

  it("maps OTP codes for email verification", () => {
    const message = buildAuthEmail({
      event_type: "send.otp",
      user: { email: "ada@example.com" },
      event_data: {
        otp_type: "email-verification",
        otp_code: "654321",
      },
    });
    expect(message?.subject).toBe(AUTH_EMAIL_SUBJECTS.confirmation);
    expect(message?.html).toContain("654321");
    expect(message?.text).toContain("This code is valid for 15 minutes.");
  });

  it("describes how long a token is valid", () => {
    const inFifteen = new Date(Date.now() + 15 * 60_000).toISOString();
    expect(expirySentence(inFifteen, "link", 15)).toBe(
      "This link is valid for 15 minutes.",
    );
    expect(expirySentence(undefined, "link", 5)).toBe(
      "This link is valid for 5 minutes.",
    );
  });
});
