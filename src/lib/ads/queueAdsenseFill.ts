/** Set synchronously before `push` so Strict Mode cannot queue the same unit twice. */
export const ADSENSE_QUEUED_ATTR = "data-gamies-ad-queued";

export function adsenseInsNeedsFill(ins: Element): boolean {
  if (ins.getAttribute(ADSENSE_QUEUED_ATTR)) return false;
  const status = ins.getAttribute("data-adsbygoogle-status");
  if (status === "done" || status === "filled") return false;
  return true;
}

/**
 * Queue one fill for a manual AdSense `<ins>`. Returns false when the unit is
 * already filled or already queued (second Strict Mode effect, Auto ads).
 */
export function queueAdsenseFill(ins: Element): boolean {
  if (typeof window === "undefined") return false;
  if (!adsenseInsNeedsFill(ins)) return false;
  ins.setAttribute(ADSENSE_QUEUED_ATTR, "1");
  const w = window as Window & { adsbygoogle?: unknown[] };
  w.adsbygoogle = w.adsbygoogle || [];
  try {
    w.adsbygoogle.push({});
  } catch {
    return false;
  }
  return true;
}
