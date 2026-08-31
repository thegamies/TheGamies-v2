import { describe, expect, it } from "vitest";
import { identityFromAuthUser } from "./oauth-identity";

describe("identityFromAuthUser", () => {
  it("reads Google name, email, and https photo", () => {
    expect(
      identityFromAuthUser({
        name: " Ada Lovelace ",
        email: "ada@x.com",
        image: "https://lh3.googleusercontent.com/photo",
      }),
    ).toEqual({
      name: "Ada Lovelace",
      email: "ada@x.com",
      imageUrl: "https://lh3.googleusercontent.com/photo",
    });
  });

  it("falls back to displayName and picture", () => {
    expect(
      identityFromAuthUser({
        displayName: "Ada",
        email: "ada@x.com",
        picture: "https://example.com/a.png",
      }),
    ).toEqual({
      name: "Ada",
      email: "ada@x.com",
      imageUrl: "https://example.com/a.png",
    });
  });

  it("ignores non-https photos", () => {
    expect(
      identityFromAuthUser({
        name: "Ada",
        image: "http://lh3.googleusercontent.com/photo",
      }),
    ).toEqual({
      name: "Ada",
      email: null,
      imageUrl: null,
    });
  });
});
