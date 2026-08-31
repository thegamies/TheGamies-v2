/** @vitest-environment jsdom */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_KEEPALIVE_INTERVAL_MS } from "@/lib/auth/session-keepalive";
import { SessionKeepAlive } from "./SessionKeepAlive";

describe("SessionKeepAlive", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("pings get-session on mount and on the keepalive interval", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    render(<SessionKeepAlive />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_KEEPALIVE_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips the interval ping while the tab is hidden", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    render(<SessionKeepAlive />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_KEEPALIVE_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
