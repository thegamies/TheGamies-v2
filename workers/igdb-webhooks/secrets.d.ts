// Secrets set with `wrangler secret put` aren't in wrangler.jsonc, so
// `wrangler types` can't see them. This merges them into the generated Env.
interface Env {
  DATABASE_URL: string;
  ADMIN_SYNC_SECRET: string;
  IGDB_WEBHOOK_SECRET: string;
  IGDB_CLIENT_ID: string;
  IGDB_CLIENT_SECRET: string;
  /** API token with Queues Edit for pause / resume. */
  CLOUDFLARE_API_TOKEN: string;
}
