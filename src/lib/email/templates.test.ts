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

  it("maps verification magic links", () => {
    const message = buildAuthEmail({
      event_type: "send.magic_link",
      user: { email: "ada@example.com" },
      event_data: {
        link_type: "email-verification",
        link_url: "https://auth.example/verify?token=abc",
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      },
    });
    expect(message?.subject).toBe(AUTH_EMAIL_SUBJECTS.confirmation);
    expect(message?.html).toContain("Confirm email");
    expect(message?.html).toContain("https://auth.example/verify?token=abc");
    expect(message?.html).not.toContain("letter-spacing:0.2em");
    expect(message?.text).not.toContain("Your code:");
    expect(message?.text).toContain("https://auth.example/verify?token=abc");
    expect(message?.text).toContain("This link is valid for 15 minutes.");
  });

  it("puts the confirmation token on the app so a session can be stored", () => {
    const message = buildAuthEmail(
      {
        event_type: "send.magic_link",
        user: { email: "ada@example.com" },
        event_data: {
          link_type: "email-verification",
          link_url:
            "https://ep-test.neon.tech/neondb/auth/verify-email?token=abc&callbackURL=https%3A%2F%2Fthegamies.gg%2Faccount",
        },
      },
      {
        appOrigin: "https://thegamies-v2-pr-12.example.workers.dev",
        neonAuthBaseUrl: "https://ep-test.neon.tech/neondb/auth/",
      },
    );
    expect(message?.html).toContain(
      "https://thegamies-v2-pr-12.example.workers.dev/auth/confirmed?token=abc",
    );
    expect(message?.html).toContain("next=%2Faccount");
    expect(message?.html).not.toContain("ep-test.neon.tech");
  });

  it("puts the password-reset token on the app reset page", () => {
    const message = buildAuthEmail(
      {
        event_type: "send.magic_link",
        user: { email: "ada@example.com" },
        event_data: {
          link_type: "forget-password",
          link_url:
            "https://ep-test.neon.tech/neondb/auth/reset-password?token=abc&redirectTo=%2Fauth%2Freset-password",
        },
      },
      {
        appOrigin: "https://thegamies-v2-pr-12.example.workers.dev",
        neonAuthBaseUrl: "https://ep-test.neon.tech/neondb/auth/",
      },
    );
    expect(message?.html).toContain(
      "https://thegamies-v2-pr-12.example.workers.dev/auth/reset-password?token=abc",
    );
    expect(message?.html).not.toContain("ep-test.neon.tech");
  });

  it("puts a path-style password-reset token on the app reset page", () => {
    const message = buildAuthEmail(
      {
        event_type: "send.magic_link",
        user: { email: "ada@example.com" },
        event_data: {
          link_type: "forget-password",
          token: "KFsLY2b9lHmTgsviFkbrS7gR",
          link_url:
            "https://ep-test.neon.tech/neondb/auth/reset-password/KFsLY2b9lHmTgsviFkbrS7gR?callbackURL=https%3A%2F%2Fapp.example%2Fauth%2Freset-password",
        },
      },
      {
        appOrigin: "https://thegamies-v2-pr-12.example.workers.dev",
        neonAuthBaseUrl: "https://ep-test.neon.tech/neondb/auth/",
      },
    );
    expect(message?.html).toContain(
      "https://thegamies-v2-pr-12.example.workers.dev/auth/reset-password?token=KFsLY2b9lHmTgsviFkbrS7gR",
    );
    expect(message?.html).not.toContain("/api/auth/reset-password/");
  });

  it("skips leftover email-verification OTP events", () => {
    expect(
      buildAuthEmail({
        event_type: "send.otp",
        user: { email: "ada@example.com" },
        event_data: {
          otp_type: "email-verification",
          otp_code: "654321",
        },
      }),
    ).toBeNull();
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
