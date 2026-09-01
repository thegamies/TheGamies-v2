/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdPrivacyOptions } from "./AdPrivacyOptions";

describe("AdPrivacyOptions", () => {
  afterEach(() => {
    cleanup();
    delete window.googlefc;
  });

  it("stays hidden until Funding Choices is ready", () => {
    render(<AdPrivacyOptions />);
    expect(screen.queryByRole("button", { name: "Ad privacy" })).toBeNull();
  });

  it("reopens the ads consent message", async () => {
    const showRevocationMessage = vi.fn();
    render(<AdPrivacyOptions />);
    const queued = window.googlefc?.callbackQueue?.[0];
    expect(queued && typeof queued === "object" && "CONSENT_API_READY" in queued).toBe(
      true,
    );
    if (queued && typeof queued === "object" && queued.CONSENT_API_READY) {
      queued.CONSENT_API_READY();
    }
    window.googlefc = {
      ...window.googlefc,
      showRevocationMessage,
    };
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ad privacy" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Ad privacy" }));
    expect(showRevocationMessage).toHaveBeenCalled();
  });
});
