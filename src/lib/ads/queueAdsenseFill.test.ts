/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADSENSE_QUEUED_ATTR,
  adsenseInsNeedsFill,
  queueAdsenseFill,
} from "./queueAdsenseFill";

function makeIns(attrs: Record<string, string> = {}) {
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  for (const [key, value] of Object.entries(attrs)) {
    ins.setAttribute(key, value);
  }
  document.body.appendChild(ins);
  return ins;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("queueAdsenseFill", () => {
  it("pushes once and ignores a second call on the same unit", () => {
    const push = vi.fn();
    Object.defineProperty(window, "adsbygoogle", {
      configurable: true,
      writable: true,
      value: { push },
    });
    const ins = makeIns();

    expect(queueAdsenseFill(ins)).toBe(true);
    expect(queueAdsenseFill(ins)).toBe(false);
    expect(push).toHaveBeenCalledTimes(1);
    expect(ins.getAttribute(ADSENSE_QUEUED_ATTR)).toBe("1");
  });

  it("does not push when AdSense already filled the unit", () => {
    const push = vi.fn();
    Object.defineProperty(window, "adsbygoogle", {
      configurable: true,
      writable: true,
      value: { push },
    });
    const ins = makeIns({ "data-adsbygoogle-status": "done" });

    expect(adsenseInsNeedsFill(ins)).toBe(false);
    expect(queueAdsenseFill(ins)).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });
});
