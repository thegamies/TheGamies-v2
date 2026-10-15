import { describe, expect, it } from "vitest";
import { BodyTooLargeError, readTextWithLimit } from "./body-limit";

function streamed(body: string, contentLength?: string) {
  const bytes = new TextEncoder().encode(body);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 4) {
        controller.enqueue(bytes.slice(i, i + 4));
      }
      controller.close();
    },
  });
  const headers = new Headers();
  if (contentLength !== undefined) headers.set("content-length", contentLength);
  return new Request("https://x.test/", {
    method: "POST",
    body: stream,
    headers,
    duplex: "half",
  } as RequestInit);
}

describe("readTextWithLimit", () => {
  it("returns the body under the limit, including multibyte text", async () => {
    await expect(
      readTextWithLimit(streamed('{"name":"Ōkami"}'), 1024),
    ).resolves.toBe('{"name":"Ōkami"}');
  });

  it("returns empty text for no body", async () => {
    await expect(
      readTextWithLimit(new Request("https://x.test/", { method: "POST" }), 10),
    ).resolves.toBe("");
  });

  it("refuses a declared length over the limit", async () => {
    await expect(
      readTextWithLimit(streamed("tiny", "999999"), 10),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("refuses a body that streams past the limit despite a small header", async () => {
    await expect(
      readTextWithLimit(streamed("x".repeat(64), "5"), 10),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
    await expect(
      readTextWithLimit(streamed("x".repeat(64)), 10),
    ).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("accepts a body exactly at the limit", async () => {
    await expect(readTextWithLimit(streamed("x".repeat(10)), 10)).resolves.toBe(
      "x".repeat(10),
    );
  });
});
