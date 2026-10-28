import { describe, expect, it } from "vitest";
import {
  confirmationText,
  expirySentence,
  recoveryText,
  renderConfirmationEmail,
  renderRecoveryEmail,
} from "./templates";

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

  it("renders confirmation HTML with the branded CTA", () => {
    const href = "https://thegamies.gg/auth/confirmed?token=abc&next=%2Faccount";
    const html = renderConfirmationEmail({
      href,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    expect(html).toContain("Confirm email");
    expect(html).toContain(
      "https://thegamies.gg/auth/confirmed?token=abc&amp;next=%2Faccount",
    );
    expect(html).not.toContain("letter-spacing:0.2em");
    expect(confirmationText({ href })).toContain(href);
    expect(confirmationText({ href })).not.toContain("Your code:");
  });

  it("renders recovery text for a link", () => {
    const href = "https://thegamies.gg/auth/reset-password?token=abc";
    expect(recoveryText({ href })).toContain(href);
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
