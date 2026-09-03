import { describe, expect, it } from "vitest";
import { ADSENSE_CLIENT_ID, adsensePublisherId } from "./adsense";
import {
  fundingChoicesScriptSrc,
  googleFcPresentScript,
} from "./funding-choices";

describe("adsensePublisherId", () => {
  it("strips the ca- prefix", () => {
    expect(adsensePublisherId(ADSENSE_CLIENT_ID)).toBe("pub-9835884276920090");
  });
});

describe("Funding Choices tag", () => {
  it("uses the publisher id Google’s CMP script expects", () => {
    expect(fundingChoicesScriptSrc(ADSENSE_CLIENT_ID)).toBe(
      "https://fundingchoicesmessages.google.com/i/pub-9835884276920090.js?ers=1",
    );
  });

  it("signals googlefcPresent", () => {
    const script = googleFcPresentScript();
    expect(script).toContain("googlefcPresent");
    expect(script).toContain("document.createElement('iframe')");
  });
});
