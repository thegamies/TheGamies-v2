import {
  DEFAULT_WEBHOOK_DRAIN_SETTINGS,
  WEBHOOK_SETTINGS_KV_KEY,
  clampDrainSettings,
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
  });
  await kv.put(WEBHOOK_SETTINGS_KV_KEY, JSON.stringify(next));
  return next;
}
