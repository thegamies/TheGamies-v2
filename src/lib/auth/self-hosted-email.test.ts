import { describe, expect, it } from "vitest";
import {
  confirmationPageHrefFromToken,
  resetPasswordPageHrefFromToken,
} from "./self-hosted-email";

describe("confirmationPageHrefFromToken", () => {
  it("builds the in-app confirm URL with token and next", () => {
    expect(
      confirmationPageHrefFromToken({
        appOrigin: "https://preview.example",
        token: "tok-1",
        callbackURL: "https://preview.example/account?next=/lists",
      }),
    ).toBe(
      "https://preview.example/auth/confirmed?token=tok-1&next=%2Flists",
    );
  });

  it("defaults next to /account", () => {
    expect(
      confirmationPageHrefFromToken({
        appOrigin: "https://preview.example/",
        token: "abc",
      }),
    ).toBe(
      "https://preview.example/auth/confirmed?token=abc&next=%2Faccount",
    );
  });
});

describe("resetPasswordPageHrefFromToken", () => {
  it("lands on the unused-token form", () => {
    expect(
      resetPasswordPageHrefFromToken({
        appOrigin: "https://preview.example",
        token: "reset-1",
      }),
    ).toBe("https://preview.example/auth/reset-password?token=reset-1");
  });
});

