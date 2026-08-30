"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/controls";
import { navItemClass } from "@/components/ui/navLevels";
import { ScrollableNav } from "@/components/ui/ScrollableNav";

type AdminWebhooksTab = "processing" | "registrations" | "events";
type EventSort = "receivedAt" | "processedAt";

type DrainSettings = {
  processingMode: "queued" | "live";
  deliveryMode: "auto" | "open" | "closed";
  intervalMinutes: number;
  maxMessagesPerDrain: number;
  paused: boolean;
  lastDrainAt: string | null;
  logRetentionHours: number;
  lastLogCleanupAt: string | null;
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

function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

/** Non-zero KV value enables hourly truncate; keep a stable default when on. */
const HOURLY_LOG_CLEAR_ON = 7 * 24;

export function AdminWebhooksClient() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminWebhooksTab>("processing");

  const [settings, setSettings] = useState<DrainSettings | null>(null);
  const [processingMode, setProcessingMode] = useState<"queued" | "live">(
    "queued",
  );
  const [intervalMinutes, setIntervalMinutes] = useState("15");
  const [deliveryMode, setDeliveryMode] = useState<"auto" | "open" | "closed">(
    "auto",
  );
  const [hourlyLogClear, setHourlyLogClear] = useState(true);

  const [overview, setOverview] = useState<RegistrationOverview | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventStatus, setEventStatus] = useState<"all" | "failed" | "processed" | "pending">(
    "all",
  );
  const [eventSort, setEventSort] = useState<EventSort>("receivedAt");
  const [testEntityId, setTestEntityId] = useState("135243");
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/admin/webhooks/settings", { cache: "no-store" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(json?.error ?? "Could not load processing settings.");
    }
    const json = (await res.json()) as { settings: DrainSettings };
    setSettings(json.settings);
    setProcessingMode(json.settings.processingMode ?? "queued");
    setIntervalMinutes(String(json.settings.intervalMinutes));
    setDeliveryMode(json.settings.deliveryMode ?? (json.settings.paused ? "closed" : "auto"));
    setHourlyLogClear((json.settings.logRetentionHours ?? HOURLY_LOG_CLEAR_ON) > 0);
  }, []);

  const loadRegistrations = useCallback(async () => {
    const res = await fetch("/api/admin/webhooks/register", { cache: "no-store" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(json?.error ?? "Could not load registrations.");
    }
    setOverview((await res.json()) as RegistrationOverview);
  }, []);

  const loadEvents = useCallback(async (
    status: typeof eventStatus,
    sort: EventSort,
  ) => {
    const qs = new URLSearchParams({
      limit: "50",
      offset: "0",
      status,
      sort,
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
      loadEvents(eventStatus, eventSort),
    ]);
  }, [loadSettings, loadRegistrations, loadEvents, eventStatus, eventSort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void Promise.all([
        loadSettings(),
        loadRegistrations(),
        loadEvents("all", "receivedAt"),
      ]).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load.");
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSettings, loadRegistrations, loadEvents]);

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
          deliveryMode,
          logRetentionHours: hourlyLogClear ? HOURLY_LOG_CLEAR_ON : 0,
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
      setDeliveryMode(
        json.settings.deliveryMode ??
          (json.settings.paused ? "closed" : "auto"),
      );
      setHourlyLogClear((json.settings.logRetentionHours ?? HOURLY_LOG_CLEAR_ON) > 0);
      setMessage("Processing settings saved.");
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
        const json = (await res.json().catch(() => null)) as {
          error?: string;
          reason?: string;
        } | null;
        if (json?.reason === "closed") {
          throw new Error("Delivery is closed. Switch to Auto or Open first.");
        }
        throw new Error(json?.error ?? "Could not open delivery.");
      }
      setMessage(
        "Delivery is open. Catalog updates apply until fewer than 25 remain, or until you close it.",
      );
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open delivery.");
    } finally {
      setBusy(false);
    }
  }

  async function cleanupOldLogs() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/webhooks/events/cleanup", {
        method: "POST",
      });
      const json = (await res.json().catch(() => null)) as {
        skipped?: boolean;
        reason?: string;
        truncated?: boolean;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Could not clear event logs.");
      }
      if (json?.skipped) {
        throw new Error("Could not clear event logs.");
      }
      setMessage("Event log cleared.");
      await refreshAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not clear event logs.",
      );
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
      await loadEvents(eventStatus, eventSort);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reprocess failed.");
    } finally {
      setBusyEventId(null);
    }
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
            void loadEvents(eventStatus, eventSort).catch((err) => {
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
          Queued holds catalog updates, then Cloudflare delivers them in
          batches while delivery is open. Live applies each update as it
          arrives.
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
                  Buffer deliveries, then apply while delivery is open.
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
              <span className="text-sm text-muted">
                Minutes between drain cycles
              </span>
              <input
                type="number"
                min={1}
                max={1440}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(e.target.value)}
                disabled={processingMode === "live" || deliveryMode !== "auto"}
                className={`mt-1 w-full ${fieldInputClass}`}
              />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm text-muted">Delivery</legend>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="radio"
                name="deliveryMode"
                checked={deliveryMode === "auto"}
                onChange={() => setDeliveryMode("auto")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Auto</span>
                <span className="mt-0.5 block text-muted">
                  Open each cycle while at least 25 updates are waiting.
                  Pauses once fewer than 25 remain, until the next cycle.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="radio"
                name="deliveryMode"
                checked={deliveryMode === "open"}
                onChange={() => setDeliveryMode("open")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Open</span>
                <span className="mt-0.5 block text-muted">
                  Keep applying. A finished drain will not pause delivery.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="radio"
                name="deliveryMode"
                checked={deliveryMode === "closed"}
                onChange={() => setDeliveryMode("closed")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Closed</span>
                <span className="mt-0.5 block text-muted">
                  Hold updates in the queue. The schedule will not open
                  delivery.
                </span>
              </span>
            </label>
          </fieldset>
          <p className="text-xs text-muted">
            Last opened: {formatTime(settings?.lastDrainAt)}
          </p>

          <fieldset className="space-y-3 border-t border-line pt-4">
            <legend className="text-sm text-muted">Event log cleanup</legend>
            <p className="text-sm text-muted">
              Clears every event log row. Failed deliveries you still need to
              reprocess should be handled before a clear.
            </p>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={hourlyLogClear}
                onChange={(e) => setHourlyLogClear(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Clear hourly</span>
                <span className="mt-0.5 block text-muted">
                  Empty the event log once an hour. Turn off to keep rows until
                  you clear them manually.
                </span>
              </span>
            </label>
            <p className="text-xs text-muted">
              Last cleared: {formatTime(settings?.lastLogCleanupAt)}
            </p>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              Save settings
            </Button>
            <Button
              type="button"
              variant="bordered"
              disabled={busy || deliveryMode === "closed"}
              onClick={() => void drainNow()}
            >
              Open delivery now
            </Button>
            <Button
              type="button"
              variant="bordered"
              disabled={busy}
              onClick={() => void cleanupOldLogs()}
            >
              Clear event logs
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
              Rows appear when a delivery is applied. Queued is when it
              arrived; processed is when it was written to the catalog.
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
                void loadEvents(next, eventSort).catch((err) => {
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
                <th className="py-3 pr-4 font-medium" aria-sort={eventSort === "receivedAt" ? "descending" : "none"}>
                  <button
                    type="button"
                    className={
                      eventSort === "receivedAt"
                        ? "uppercase tracking-[0.15em] text-ink"
                        : "uppercase tracking-[0.15em] text-muted hover:text-ink"
                    }
                    onClick={() => {
                      setEventSort("receivedAt");
                      void loadEvents(eventStatus, "receivedAt").catch((err) => {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Failed to load events.",
                        );
                      });
                    }}
                  >
                    Queued
                  </button>
                </th>
                <th className="py-3 pr-4 font-medium" aria-sort={eventSort === "processedAt" ? "descending" : "none"}>
                  <button
                    type="button"
                    className={
                      eventSort === "processedAt"
                        ? "uppercase tracking-[0.15em] text-ink"
                        : "uppercase tracking-[0.15em] text-muted hover:text-ink"
                    }
                    onClick={() => {
                      setEventSort("processedAt");
                      void loadEvents(eventStatus, "processedAt").catch((err) => {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Failed to load events.",
                        );
                      });
                    }}
                  >
                    Processed
                  </button>
                </th>
                <th className="py-3 pr-4 font-medium">Entity</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Error</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                    <td colSpan={6} className="py-6 text-muted">
                    No webhook events yet.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b border-line/70 align-top">
                    <td className="py-3 pr-4 text-muted">
                      {formatTime(event.receivedAt)}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {formatTime(event.processedAt)}
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
                      {event.status === "failed" || event.status === "pending" ? (
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
