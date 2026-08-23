import {
  DEFAULT_WEBHOOK_DRAIN_SETTINGS,
  WEBHOOK_DRAIN_LOCK_KV_KEY,
  WEBHOOK_SETTINGS_KV_KEY,
  clampDrainSettings,
  parseDrainLock,
  type WebhookDrainLock,
  type WebhookDrainSettings,
} from "@thegamies/igdb";

export async function readDrainSettings(
  kv: KVNamespace,
): Promise<WebhookDrainSettings> {
  const raw = await kv.get(WEBHOOK_SETTINGS_KV_KEY, "json");
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_WEBHOOK_DRAIN_SETTINGS };
  }
  return clampDrainSettings(raw as Partial<WebhookDrainSettings>);
}

export async function writeDrainSettings(
  kv: KVNamespace,
  input: Partial<WebhookDrainSettings>,
): Promise<WebhookDrainSettings> {
  const current = await readDrainSettings(kv);
  const next = clampDrainSettings({
    ...current,
    ...input,
    lastDrainAt:
      input.lastDrainAt !== undefined
        ? input.lastDrainAt
        : current.lastDrainAt,
    forceOpenUntil:
      input.forceOpenUntil !== undefined
        ? input.forceOpenUntil
        : current.forceOpenUntil,
    drainPending:
      input.drainPending !== undefined
        ? input.drainPending
        : current.drainPending,
  });
  await kv.put(WEBHOOK_SETTINGS_KV_KEY, JSON.stringify(next));
  return next;
}

export async function readDrainLock(
  kv: KVNamespace,
): Promise<WebhookDrainLock | null> {
  const raw = await kv.get(WEBHOOK_DRAIN_LOCK_KV_KEY, "json");
  return parseDrainLock(raw);
}

export async function writeDrainLock(
  kv: KVNamespace,
  until: string,
): Promise<void> {
  await kv.put(
    WEBHOOK_DRAIN_LOCK_KV_KEY,
    JSON.stringify({ until } satisfies WebhookDrainLock),
  );
}

export async function clearDrainLock(kv: KVNamespace): Promise<void> {
  await kv.delete(WEBHOOK_DRAIN_LOCK_KV_KEY);
}
