import { describe, expect, it, vi } from "vitest";
import {
  cronJobsArePaused,
  parseCronSettings,
  readCronSettings,
  writeCronSettings,
} from "./cron-settings";

describe("parseCronSettings", () => {
  it("defaults to running", () => {
    expect(parseCronSettings(null)).toEqual({ paused: false });
    expect(parseCronSettings({})).toEqual({ paused: false });
  });

  it("reads paused", () => {
    expect(parseCronSettings({ paused: true })).toEqual({ paused: true });
  });
});

describe("cronJobsArePaused", () => {
  it("is false unless paused is true", () => {
    expect(cronJobsArePaused({ paused: false })).toBe(false);
    expect(cronJobsArePaused({ paused: true })).toBe(true);
  });
});

describe("readCronSettings", () => {
  it("defaults when the binding is missing", async () => {
    await expect(readCronSettings(undefined)).resolves.toEqual({
      paused: false,
    });
  });

  it("loads JSON from KV", async () => {
    const get = vi.fn().mockResolvedValue({ paused: true });
    await expect(
      readCronSettings({ get, put: vi.fn() }),
    ).resolves.toEqual({ paused: true });
    expect(get).toHaveBeenCalledWith("cron", { type: "json" });
  });
});

describe("writeCronSettings", () => {
  it("puts paused JSON", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    await expect(
      writeCronSettings({ get: vi.fn(), put }, true),
    ).resolves.toEqual({ paused: true });
    expect(put).toHaveBeenCalledWith("cron", '{"paused":true}');
  });
});
