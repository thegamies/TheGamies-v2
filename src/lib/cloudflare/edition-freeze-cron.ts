export const EDITION_FREEZE_CRON_PATH = "/api/cron/edition-freeze";

export type EditionFreezeCronFetcher = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

export type EditionFreezeCronEnv = {
  CRON_SECRET?: string;
  WORKER_SELF_REFERENCE?: EditionFreezeCronFetcher;
};

export function editionFreezeCronSecret(
  env: Pick<EditionFreezeCronEnv, "CRON_SECRET">,
): string | null {
  const secret = env.CRON_SECRET?.trim();
  return secret ? secret : null;
}

export function editionFreezeCronRequest(secret: string): Request {
  return new Request(`https://internal${EDITION_FREEZE_CRON_PATH}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
}

/** Skip when secret or self-binding is missing (PR previews). Throw on HTTP failure so Cron retries. */
export async function runEditionFreezeCron(
  env: EditionFreezeCronEnv,
): Promise<"skipped" | "ok"> {
  const secret = editionFreezeCronSecret(env);
  const fetcher = env.WORKER_SELF_REFERENCE;
  if (!secret || !fetcher) return "skipped";

  const response = await fetcher.fetch(editionFreezeCronRequest(secret));
  if (!response.ok) {
    throw new Error(`Edition freeze cron failed (${response.status}).`);
  }
  return "ok";
}
