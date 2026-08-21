interface Env {
  IGDB_WEBHOOK_QUEUE: Queue;
  IGDB_WEBHOOK_SETTINGS: KVNamespace;
  DATABASE_URL: string;
  ADMIN_SYNC_SECRET: string;
  IGDB_WEBHOOK_SECRET: string;
  IGDB_CLIENT_ID: string;
  IGDB_CLIENT_SECRET: string;
  /** Account id for Queues HTTP pull. */
  CLOUDFLARE_ACCOUNT_ID: string;
  /** Queue id (UUID) for Queues HTTP pull. */
  IGDB_WEBHOOK_QUEUE_ID: string;
  /** API token with Queues Edit for pull/ack. */
  CLOUDFLARE_API_TOKEN: string;
  /** Public callback base URL, e.g. https://igdb-webhooks.example.workers.dev */
  IGDB_WEBHOOK_PUBLIC_URL?: string;
}

declare namespace Cloudflare {
  interface Env {}
}
