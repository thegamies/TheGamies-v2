import { timingSafeEqualString } from "./timing-safe";
import {
  formatIgdbWebhookSecret,
  parseIgdbWebhookSecret,
  WEBHOOK_ENTITY_LIST,
  WEBHOOK_METHOD_LIST,
  type WebhookEntity,
  type WebhookMethod,
} from "./webhook-routing";
import {
  deleteIgdbWebhook,
  listIgdbWebhooks,
  registerIgdbWebhook,
  type IgdbWebhookRegistration,
} from "./webhooks-api";

const ENTITY_LABELS: Record<WebhookEntity, string> = {
  games: "Games",
  covers: "Covers",
  platforms: "Platforms",
  keywords: "Keywords",
  themes: "Themes",
  game_types: "Game types",
  genres: "Genres",
  companies: "Companies",
  involved_companies: "Involved companies",
  game_time_to_beats: "Game time to beat",
};

const METHOD_LABELS: Record<WebhookMethod, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
};

export type WebhookSlotStatus = "not_registered" | "active" | "inactive";

export type WebhookSlotView = {
  entity: WebhookEntity;
  method: WebhookMethod;
  label: string;
  status: WebhookSlotStatus;
  igdbWebhookId: number | null;
  callbackUrl: string | null;
  updatedAt: string | null;
};

export type WebhookOrphan = {
  id: number;
  url: string;
  active: boolean;
  reason: string;
};

export type WebhookRegistrationOverview = {
  callbackUrl: string;
  slots: WebhookSlotView[];
  orphans: WebhookOrphan[];
};

export type RegisterWebhookSlotsResult = {
  callbackUrl: string;
  registered: Array<{
    id: number;
    entity: WebhookEntity;
    method: WebhookMethod;
    url: string;
    active: boolean;
  }>;
  skipped: Array<{
    entity: WebhookEntity;
    method: WebhookMethod;
    reason: string;
  }>;
  errors: Array<{
    entity: WebhookEntity;
    method: WebhookMethod;
    message: string;
  }>;
};

export function webhookTypeLabel(
  entity: WebhookEntity,
  method: WebhookMethod,
): string {
  return `${ENTITY_LABELS[entity]}: ${METHOD_LABELS[method]}`;
}

export function supportedWebhookTypes(): Array<{
  entity: WebhookEntity;
  method: WebhookMethod;
  label: string;
}> {
  const types: Array<{
    entity: WebhookEntity;
    method: WebhookMethod;
    label: string;
  }> = [];
  for (const entity of WEBHOOK_ENTITY_LIST) {
    for (const method of WEBHOOK_METHOD_LIST) {
      types.push({
        entity,
        method,
        label: webhookTypeLabel(entity, method),
      });
    }
  }
  return types;
}

function methodFromSubCategory(subCategory: number): WebhookMethod | null {
  return WEBHOOK_METHOD_LIST[subCategory] ?? null;
}

function resolveRegistrationSlot(
  registration: IgdbWebhookRegistration,
  baseSecret: string,
): { entity: WebhookEntity; method: WebhookMethod } | null {
  const fromSecret = parseIgdbWebhookSecret(registration.secret, baseSecret);
  if (fromSecret) return fromSecret;

  const method = methodFromSubCategory(registration.sub_category);
  if (!method) return null;

  if (timingSafeEqualString(registration.secret, baseSecret)) {
    return null;
  }

  return null;
}

export function normalizeWebhookRegistrations(
  registrations: IgdbWebhookRegistration[],
  baseSecret: string,
  callbackUrl: string,
): WebhookRegistrationOverview {
  const slotMap = new Map<string, IgdbWebhookRegistration[]>();

  for (const registration of registrations) {
    const slot = resolveRegistrationSlot(registration, baseSecret);
    if (!slot) continue;

    const key = `${slot.entity}:${slot.method}`;
    const bucket = slotMap.get(key) ?? [];
    bucket.push(registration);
    slotMap.set(key, bucket);
  }

  const orphans: WebhookOrphan[] = [];

  for (const registration of registrations) {
    const slot = resolveRegistrationSlot(registration, baseSecret);
    if (!slot) {
      orphans.push({
        id: registration.id,
        url: registration.url,
        active: registration.active,
        reason: "Unrecognized secret. Delete and re-register with a typed secret",
      });
      continue;
    }

    const key = `${slot.entity}:${slot.method}`;
    const bucket = slotMap.get(key) ?? [];
    const primary =
      bucket.find((row) => row.active) ??
      [...bucket].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

    if (primary && registration.id !== primary.id) {
      orphans.push({
        id: registration.id,
        url: registration.url,
        active: registration.active,
        reason: `Duplicate for ${webhookTypeLabel(slot.entity, slot.method)}`,
      });
    }
  }

  const slots: WebhookSlotView[] = supportedWebhookTypes().map(
    ({ entity, method, label }) => {
      const key = `${entity}:${method}`;
      const bucket = slotMap.get(key) ?? [];
      const primary =
        bucket.find((row) => row.active) ??
        [...bucket].sort((a, b) =>
          b.updated_at.localeCompare(a.updated_at),
        )[0];

      if (!primary) {
        return {
          entity,
          method,
          label,
          status: "not_registered",
          igdbWebhookId: null,
          callbackUrl: null,
          updatedAt: null,
        };
      }

      return {
        entity,
        method,
        label,
        status: primary.active ? "active" : "inactive",
        igdbWebhookId: primary.id,
        callbackUrl: primary.url,
        updatedAt: primary.updated_at,
      };
    },
  );

  return { callbackUrl, slots, orphans };
}

export async function fetchWebhookRegistrationOverview(
  baseSecret: string,
  callbackUrl: string,
): Promise<WebhookRegistrationOverview> {
  const registrations = await listIgdbWebhooks();
  return normalizeWebhookRegistrations(registrations, baseSecret, callbackUrl);
}

export async function registerIgdbWebhookSlot(
  entity: WebhookEntity,
  method: WebhookMethod,
  callbackUrl: string,
  baseSecret: string,
): Promise<IgdbWebhookRegistration> {
  const overview = await fetchWebhookRegistrationOverview(
    baseSecret,
    callbackUrl,
  );
  const slot = overview.slots.find(
    (row) => row.entity === entity && row.method === method,
  );

  if (!slot) {
    throw new Error(`Unsupported webhook type: ${entity} ${method}`);
  }

  if (slot.status === "active") {
    throw new Error(`${slot.label} is already registered and active`);
  }

  if (slot.status === "inactive" && slot.igdbWebhookId) {
    await deleteIgdbWebhook(slot.igdbWebhookId);
  }

  const secret = formatIgdbWebhookSecret(baseSecret, entity, method);
  return registerIgdbWebhook(entity, method, callbackUrl, secret);
}

export async function registerMissingIgdbWebhooks(
  callbackUrl: string,
  baseSecret: string,
): Promise<RegisterWebhookSlotsResult> {
  const overview = await fetchWebhookRegistrationOverview(
    baseSecret,
    callbackUrl,
  );
  const registered: RegisterWebhookSlotsResult["registered"] = [];
  const skipped: RegisterWebhookSlotsResult["skipped"] = [];
  const errors: RegisterWebhookSlotsResult["errors"] = [];

  for (const slot of overview.slots) {
    if (slot.status === "active") {
      skipped.push({
        entity: slot.entity,
        method: slot.method,
        reason: "already active",
      });
      continue;
    }

    try {
      const result = await registerIgdbWebhookSlot(
        slot.entity,
        slot.method,
        callbackUrl,
        baseSecret,
      );
      registered.push({
        id: result.id,
        entity: slot.entity,
        method: slot.method,
        url: result.url,
        active: result.active,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        entity: slot.entity,
        method: slot.method,
        message,
      });
    }
  }

  return { callbackUrl, registered, skipped, errors };
}
