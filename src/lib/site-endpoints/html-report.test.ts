import { describe, expect, it } from "vitest";
import { formatEndpointsHtml } from "./html-report";

describe("formatEndpointsHtml", () => {
  it("embeds the catalog and filter chips", () => {
    const html = formatEndpointsHtml();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Test first");
    expect(html).toContain('id="priorities"');
    expect(html).toContain('id="groups"');
    expect(html).toContain('"path":"/"');
    expect(html).toContain("/games/:slug");
    expect(html).toContain("Cache easy");
    expect(html).toContain("Cache hard");
    expect(html).toContain("cacheFirst");
    expect(html).toContain("th.sort");
    expect(html).toContain("--bg: #121110");
    expect(html).not.toContain("</script></script>");
  });
});
