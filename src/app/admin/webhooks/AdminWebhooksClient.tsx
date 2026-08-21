"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";

type AdminWebhooksTab = "processing" | "registrations" | "events";

type DrainSettings = {
  processingMode: "queued" | "live";
  intervalMinutes: number;
  maxMessagesPerDrain: number;
  paused: boolean;
  lastDrainAt: string | null;
};

type WebhookSlot = {
  entity: string;
  method: string;
  label: string;
  status: "not_registered" | "active" | "inactive";
  igdbWebhookId: number | null;
  callbackUrl: string | null;
  updatedAt: string | null;
};

type WebhookOrphan = {
  id: number;
  url: string;
  active: boolean;
  reason: string;
};

type RegistrationOverview = {
  callbackUrl: string;
  slots: WebhookSlot[];
  orphans: WebhookOrphan[];
};

type WebhookEvent = {
  id: string;
  receivedAt: string | Date;
  processedAt: string | Date | null;
  entity: string | null;
  method: string | null;
  igdbId: number | null;
  status: string;
  error: string | null;
};

type Props = {
  authorized: boolean;
};

function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function AdminWebhooksClient({ authorized: initiallyAuthorized }: Props) {
  const [authorized, setAuthorized] = useState(initiallyAuthorized);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminWebhooksTab>("processing");

  const [settings, setSettings] = useState<DrainSettings | null>(null);
  const [processingMode, setProcessingMode] = useState<"queued" | "live">(
    "queued",
  );
  const [intervalMinutes, setIntervalMinutes] = useState("15");
  const [maxMessages, setMaxMessages] = useState("25");
  const [paused, setPaused] = useState(false);

  const [overview, setOverview] = useState<RegistrationOverview | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventStatus, setEventStatus] = useState<"all" | "failed" | "processed" | "pending">(
    "all",
  );
  const [testEntityId, setTestEntityId] = useState("135243");
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/admin/webhooks/settings", { cache: "no-store" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(json?.error ?? "Could not load drain settings.");
    }
    const json = (await res.json()) as { settings: DrainSettings };
    setSettings(json.settings);
    setProcessingMode(json.settings.processingMode ?? "queued");
    setIntervalMinutes(String(json.settings.intervalMinutes));
    setMaxMessages(String(json.settings.maxMessagesPerDrain));
    setPaused(json.settings.paused);
  }, []);

  const loadRegistrations = useCallback(async () => {
    const res = await fetch("/api/admin/webhooks/register", { cache: "no-store" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(json?.error ?? "Could not load registrations.");
    }
    setOverview((await res.json()) as RegistrationOverview);
  }, []);

  const loadEvents = useCallback(async (status: typeof eventStatus) => {
    const qs = new URLSearchParams({
      limit: "50",
      offset: "0",
      status,
    });
    const res = await fetch(`/api/admin/webhooks/events?${qs}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(json?.error ?? "Could not load events.");
    }
    const json = (await res.json()) as {
      events: WebhookEvent[];
      total: number;
    };
    setEvents(json.events);
    setEventTotal(json.total);
  }, []);

  const refreshAll = useCallback(async () => {
    setError(null);
    await Promise.all([
      loadSettings(),
      loadRegistrations(),
      loadEvents(eventStatus),
    ]);
  }, [loadSettings, loadRegistrations, loadEvents, eventStatus]);

  useEffect(() => {
    if (!authorized) return;
    const timer = setTimeout(() => {
      void Promise.all([
        loadSettings(),
        loadRegistrations(),
        loadEvents("all"),
      ]).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load.");
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [authorized, loadSettings, loadRegistrations, loadEvents]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        setError("Could not unlock admin.");
        return;
      }
      setAuthorized(true);
      setSecret("");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/webhooks/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processingMode,
          intervalMinutes: Number(intervalMinutes),
          maxMessagesPerDrain: Number(maxMessages),
          paused,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        settings?: DrainSettings;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(
          json?.error ?? `Could not save settings (${res.status}).`,
        );
      }
      if (!json?.settings) {
        throw new Error("Could not save settings (empty response).");
      }
      setSettings(json.settings);
      setProcessingMode(json.settings.processingMode ?? "queued");
      setIntervalMinutes(String(json.settings.intervalMinutes));
      setMaxMessages(String(json.settings.maxMessagesPerDrain));
      setPaused(json.settings.paused);
      setMessage("Drain settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  async function drainNow() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/webhooks/drain", { method: "POST" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Drain failed.");
      }
      const json = (await res.json()) as {
        skipped?: boolean;
        reason?: string;
        pulled: number;
        processed: number;
        failed: number;
        emptied?: boolean;
      };
      if (json.skipped) {
        setMessage(`Drain skipped (${json.reason ?? "not ready"}).`);
      } else {
        const emptied =
          "emptied" in json && json.emptied === false
            ? " Queue still has messages; next minute continues."
            : "";
        setMessage(
          `Drain finished: ${json.pulled} pulled, ${json.processed} processed, ${json.failed} failed.${emptied}`,
        );
      }
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drain failed.");
    } finally {
      setBusy(false);
    }
  }

  async function registerAll() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/webhooks/register/all", {
        method: "POST",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Register all failed.");
      }
      const json = (await res.json()) as {
        registered: unknown[];
        skipped: unknown[];
        errors: unknown[];
      };
      setMessage(
        `Registered ${json.registered.length}, skipped ${json.skipped.length}, errors ${json.errors.length}.`,
      );
      await loadRegistrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register all failed.");
    } finally {
      setBusy(false);
    }
  }

  async function registerSlot(slot: WebhookSlot) {
    const key = `${slot.entity}:${slot.method}`;
    setBusySlot(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/webhooks/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: slot.entity, method: slot.method }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Register failed.");
      }
      setMessage(`Registered ${slot.label}.`);
      await loadRegistrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed.");
    } finally {
      setBusySlot(null);
    }
  }

  async function deleteSlot(slot: WebhookSlot) {
    if (!slot.igdbWebhookId) return;
    const key = `${slot.entity}:${slot.method}`;
    setBusySlot(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/webhooks/register?webhookId=${slot.igdbWebhookId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Delete failed.");
      }
      setMessage(`Removed ${slot.label}.`);
      await loadRegistrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusySlot(null);
    }
  }

  async function testSlot(slot: WebhookSlot) {
    if (!slot.igdbWebhookId) return;
    const key = `${slot.entity}:${slot.method}`;
    setBusySlot(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/webhooks/register/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: slot.entity,
          webhookId: slot.igdbWebhookId,
          entityId: Number(testEntityId),
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Test failed.");
      }
      setMessage(`Test requested for ${slot.label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed.");
    } finally {
      setBusySlot(null);
    }
  }

  async function reprocessEvent(eventId: string) {
    setBusyEventId(eventId);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/webhooks/events/${eventId}/reprocess`,
        { method: "POST" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Reprocess failed.");
      }
      setMessage("Event reprocessed.");
      await loadEvents(eventStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reprocess failed.");
    } finally {
      setBusyEventId(null);
    }
  }

  if (!authorized) {
    return (
      <form onSubmit={unlock} className="max-w-md space-y-4">
        <label className="block">
          <span className="text-sm text-muted">Admin code</span>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className={`mt-1 w-full ${fieldInputClass}`}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={busy || !secret}>
          Unlock
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      {(message || error) && (
        <div className="space-y-1">
          {message ? <p className="text-sm text-muted">{message}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      )}

      <ScrollableNav aria-label="Catalog webhooks" className="mt-2">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "processing"}
          className={navItemClass("secondary", tab === "processing")}
          onClick={() => setTab("processing")}
        >
          Processing
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "registrations"}
          className={navItemClass("secondary", tab === "registrations")}
          onClick={() => setTab("registrations")}
        >
          Registrations
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "events"}
          className={navItemClass("secondary", tab === "events")}
          onClick={() => {
            setTab("events");
            void loadEvents(eventStatus).catch((err) => {
              setError(
                err instanceof Error ? err.message : "Failed to load events.",
              );
            });
          }}
        >
          Events
        </button>
      </ScrollableNav>

      {tab === "processing" ? (
      <section className="max-w-xl space-y-4 border-y border-line py-8">
        <h2 className="font-display text-3xl tracking-wide text-ink">
          Processing
        </h2>
        <p className="text-sm text-muted">
          Queued keeps Neon asleep between drains. Live applies each catalog
          update as soon as it arrives.
        </p>
        <form onSubmit={saveSettings} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm text-muted">Mode</legend>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="radio"
                name="processingMode"
                checked={processingMode === "queued"}
                onChange={() => setProcessingMode("queued")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Queued</span>
                <span className="mt-0.5 block text-muted">
                  Buffer deliveries, then drain on a schedule.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="radio"
                name="processingMode"
                checked={processingMode === "live"}
                onChange={() => setProcessingMode("live")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Live</span>
                <span className="mt-0.5 block text-muted">
                  Apply to the catalog immediately on each delivery.
                </span>
              </span>
            </label>
          </fieldset>

          <div
            className={
              processingMode === "live"
                ? "space-y-4 opacity-50"
                : "space-y-4"
            }
          >
            <label className="block">
              <span className="text-sm text-muted">Minutes between drains</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(e.target.value)}
                disabled={processingMode === "live"}
                className={`mt-1 w-full ${fieldInputClass}`}
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">
                Messages per pull (batch size)
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={maxMessages}
                onChange={(e) => setMaxMessages(e.target.value)}
                disabled={processingMode === "live"}
                className={`mt-1 w-full ${fieldInputClass}`}
              />
              <span className="mt-1 block text-xs text-muted">
                Each drain keeps pulling batches of this size until the queue is
                empty.
              </span>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={paused}
              onChange={(e) => setPaused(e.target.checked)}
            />
            {processingMode === "live"
              ? "Pause live applies (new deliveries go to the queue instead)"
              : "Pause automatic drains"}
          </label>
          <p className="text-xs text-muted">
            Last drain: {formatTime(settings?.lastDrainAt)}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              Save settings
            </Button>
            <Button
              type="button"
              variant="bordered"
              disabled={busy}
              onClick={() => void drainNow()}
            >
              Drain now
            </Button>
          </div>
        </form>
      </section>
      ) : null}

      {tab === "registrations" ? (
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl tracking-wide text-ink">
              IGDB registrations
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Callbacks point at the Cloudflare webhook worker. Register only
              against the environment that should receive live catalog traffic.
            </p>
            {overview ? (
              <p className="mt-2 text-xs text-muted">
                Callback: {overview.callbackUrl}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm text-muted">
              Test entity id
              <input
                value={testEntityId}
                onChange={(e) => setTestEntityId(e.target.value)}
                className={`ml-2 w-28 ${fieldInputClass}`}
              />
            </label>
            <Button
              type="button"
              variant="bordered"
              disabled={busy}
              onClick={() => void registerAll()}
            >
              Register missing
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border-y border-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.15em] text-muted">
                <th className="py-3 pr-4 font-medium">Slot</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Updated</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.slots ?? []).map((slot) => {
                const key = `${slot.entity}:${slot.method}`;
                return (
                  <tr key={key} className="border-b border-line/70">
                    <td className="py-3 pr-4 text-ink">{slot.label}</td>
                    <td className="py-3 pr-4 text-muted">
                      {slot.status === "not_registered"
                        ? "Not registered"
                        : slot.status === "active"
                          ? "Active"
                          : "Inactive"}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {formatTime(slot.updatedAt)}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {slot.status !== "active" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="bordered"
                            disabled={busySlot === key}
                            onClick={() => void registerSlot(slot)}
                          >
                            Register
                          </Button>
                        ) : null}
                        {slot.igdbWebhookId ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="quiet"
                              disabled={busySlot === key}
                              onClick={() => void testSlot(slot)}
                            >
                              Test
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger-bordered"
                              disabled={busySlot === key}
                              onClick={() => void deleteSlot(slot)}
                            >
                              Remove
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(overview?.orphans?.length ?? 0) > 0 ? (
          <div className="space-y-2">
            <h3 className="font-display text-xl tracking-wide text-ink">
              Orphan registrations
            </h3>
            <ul className="divide-y divide-line border-y border-line text-sm">
              {overview!.orphans.map((orphan) => (
                <li
                  key={orphan.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-ink">#{orphan.id}</p>
                    <p className="text-muted">{orphan.reason}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger-bordered"
                    onClick={() =>
                      void deleteSlot({
                        entity: "games",
                        method: "create",
                        label: `Orphan ${orphan.id}`,
                        status: orphan.active ? "active" : "inactive",
                        igdbWebhookId: orphan.id,
                        callbackUrl: orphan.url,
                        updatedAt: null,
                      })
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      ) : null}

      {tab === "events" ? (
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl tracking-wide text-ink">
              Recent events
            </h2>
            <p className="mt-1 text-sm text-muted">
              Logged when a delivery is applied — on drain in Queued mode, or
              immediately in Live mode.
            </p>
          </div>
          <label className="text-sm text-muted">
            Status
            <select
              value={eventStatus}
              onChange={(e) => {
                const next = e.target.value as
                  | "all"
                  | "failed"
                  | "processed"
                  | "pending";
                setEventStatus(next);
                void loadEvents(next).catch((err) => {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to load events.",
                  );
                });
              }}
              className={`ml-2 ${fieldInputClass}`}
            >
              <option value="all">All</option>
              <option value="failed">Failed</option>
              <option value="processed">Processed</option>
              <option value="pending">Pending</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-muted">{eventTotal} total</p>
        <div className="overflow-x-auto border-y border-line">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.15em] text-muted">
                <th className="py-3 pr-4 font-medium">When</th>
                <th className="py-3 pr-4 font-medium">Entity</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Error</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-muted">
                    No webhook events yet.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b border-line/70 align-top">
                    <td className="py-3 pr-4 text-muted">
                      {formatTime(event.receivedAt)}
                    </td>
                    <td className="py-3 pr-4 text-ink">
                      {event.entity ?? "—"} / {event.method ?? "—"}
                      {event.igdbId != null ? ` #${event.igdbId}` : ""}
                    </td>
                    <td className="py-3 pr-4 text-muted">{event.status}</td>
                    <td className="max-w-xs py-3 pr-4 text-muted">
                      {event.error ?? "—"}
                    </td>
                    <td className="py-3">
                      {event.status === "failed" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="bordered"
                          disabled={busyEventId === event.id}
                          onClick={() => void reprocessEvent(event.id)}
                        >
                          Reprocess
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}
    </div>
  );
}
