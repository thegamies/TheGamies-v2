import {
  timingSafeEqualString,
  timingSafeStartsWith,
} from "./timing-safe";

export type WebhookEntity =
  | "games"
  | "covers"
  | "platforms"
  | "keywords"
  | "themes"
  | "game_types"
  | "genres"
  | "companies"
  | "involved_companies"
  | "game_time_to_beats";

export type WebhookMethod = "create" | "update" | "delete";

export const WEBHOOK_ENTITIES = new Set<WebhookEntity>([
  "games",
  "covers",
  "platforms",
  "keywords",
  "themes",
  "game_types",
  "genres",
  "companies",
  "involved_companies",
  "game_time_to_beats",
]);

export const WEBHOOK_METHODS = new Set<WebhookMethod>([
  "create",
  "update",
  "delete",
]);

export const WEBHOOK_ENTITY_LIST: WebhookEntity[] = [...WEBHOOK_ENTITIES];
export const WEBHOOK_METHOD_LIST: WebhookMethod[] = [...WEBHOOK_METHODS];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDeletePayload(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const keys = Object.keys(payload);
  return keys.length === 1 && keys[0] === "id" && typeof payload.id === "number";
}

/** Per-registration secret IGDB echoes in X-Secret: `{base}:{entity}:{method}`. */
export function formatIgdbWebhookSecret(
  baseSecret: string,
  entity: WebhookEntity,
  method: WebhookMethod,
): string {
  return `${baseSecret}:${entity}:${method}`;
}

export function parseIgdbWebhookSecret(
  receivedSecret: string,
  baseSecret: string,
): { entity: WebhookEntity; method: WebhookMethod } | null {
  const prefix = `${baseSecret}:`;
  if (!timingSafeStartsWith(receivedSecret, prefix)) return null;

  const [entity, method] = receivedSecret.slice(prefix.length).split(":");
  if (!entity || !method) return null;
  if (!WEBHOOK_ENTITIES.has(entity as WebhookEntity)) return null;
  if (!WEBHOOK_METHODS.has(method as WebhookMethod)) return null;

  return { entity: entity as WebhookEntity, method: method as WebhookMethod };
}

export function verifyIgdbWebhookSecret(
  receivedSecret: string,
  baseSecret: string,
): boolean {
  if (timingSafeEqualString(receivedSecret, baseSecret)) return true;
  return parseIgdbWebhookSecret(receivedSecret, baseSecret) !== null;
}

export function inferWebhookEntityFromPayload(
  payload: unknown,
): WebhookEntity | null {
  if (!isRecord(payload)) return null;

  if ("image_id" in payload) return "covers";
  if ("abbreviation" in payload || "platform_logo" in payload) {
    return "platforms";
  }
  if (
    "first_release_date" in payload ||
    "platforms" in payload ||
    "genres" in payload ||
    "keywords" in payload ||
    "themes" in payload ||
    "involved_companies" in payload ||
    "version_parent" in payload ||
    "parent_game" in payload ||
    "game_type" in payload ||
    "version_title" in payload ||
    "rating" in payload ||
    "rating_count" in payload ||
    "total_rating" in payload ||
    "total_rating_count" in payload ||
    "aggregated_rating" in payload ||
    "artworks" in payload
  ) {
    return "games";
  }

  if ("hastily" in payload || "normally" in payload || "completely" in payload) {
    if ("game_id" in payload) return "game_time_to_beats";
  }

  if (
    "developer" in payload ||
    "publisher" in payload ||
    "porting" in payload ||
    "supporting" in payload
  ) {
    if ("company" in payload || "game" in payload) return "involved_companies";
  }

  if (
    "type" in payload &&
    typeof payload.type === "string" &&
    !("name" in payload) &&
    !("slug" in payload) &&
    !("image_id" in payload)
  ) {
    return "game_types";
  }

  if ("name" in payload && !("game" in payload) && !("company" in payload)) {
    return "platforms";
  }

  return null;
}

export function inferWebhookMethodFromPayload(payload: unknown): WebhookMethod {
  return isDeletePayload(payload) ? "delete" : "update";
}

export function resolveWebhookEntity(
  headerValue: string | null,
  payload: unknown,
): WebhookEntity {
  const normalized = headerValue?.trim().toLowerCase();
  if (normalized && WEBHOOK_ENTITIES.has(normalized as WebhookEntity)) {
    return normalized as WebhookEntity;
  }

  const inferred = inferWebhookEntityFromPayload(payload);
  if (inferred) return inferred;

  throw new Error(
    "Missing X-Endpoint header and could not infer entity from webhook payload",
  );
}

export function resolveWebhookMethod(
  headerValue: string | null,
  payload: unknown,
): WebhookMethod {
  const normalized = headerValue?.trim().toLowerCase();
  if (normalized && WEBHOOK_METHODS.has(normalized as WebhookMethod)) {
    return normalized as WebhookMethod;
  }

  return inferWebhookMethodFromPayload(payload);
}

export function resolveWebhookRouting(input: {
  receivedSecret: string;
  baseSecret: string;
  endpointHeader: string | null;
  operationHeader: string | null;
  payload: unknown;
}): { entity: WebhookEntity; method: WebhookMethod } {
  const fromSecret = parseIgdbWebhookSecret(
    input.receivedSecret,
    input.baseSecret,
  );
  if (fromSecret) return fromSecret;

  return {
    entity: resolveWebhookEntity(input.endpointHeader, input.payload),
    method: resolveWebhookMethod(input.operationHeader, input.payload),
  };
}

export function tryExtractWebhookIgdbId(payload: unknown): number | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.id === "number" && Number.isFinite(payload.id)) {
    return payload.id;
  }
  if (typeof payload.game_id === "number" && Number.isFinite(payload.game_id)) {
    return payload.game_id;
  }
  return null;
}

export type IgdbWebhookEnvelope = {
  receivedAt: string;
  entity: WebhookEntity | null;
  method: WebhookMethod | null;
  igdbId: number | null;
  headers: { endpoint?: string; operation?: string };
  body: unknown;
  /** Set when ingress could not route; drain writes a failed event. */
  ingressError?: string;
};
