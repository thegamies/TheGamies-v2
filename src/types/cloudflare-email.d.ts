declare global {
  interface CloudflareEnv {
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
