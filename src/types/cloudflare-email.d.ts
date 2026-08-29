declare global {
  interface CloudflareEnv {
    CRON_SECRET?: string;
    WORKER_SELF_REFERENCE?: {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
    "CRON_SETTINGS"?: {
      get(key: string, options: { type: "json" }): Promise<unknown>;
      put(key: string, value: string): Promise<void>;
    };
    EMAIL?: {
      send(message: {
        to: string;
        from: string;
        subject: string;
        html?: string;
        text?: string;
      }): Promise<{ messageId?: string }>;
    };
  }
}

export {};
