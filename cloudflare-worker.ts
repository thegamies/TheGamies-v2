// `.open-next/worker.js` is generated at OpenNext build time.
// @ts-expect-error generated output is not in the TypeScript project
import { default as handler } from "./.open-next/worker.js";
import { runCloudflareScheduledJobs } from "./src/lib/cloudflare/scheduled-jobs";

export default {
  fetch: handler.fetch,

  async scheduled(
    _controller: unknown,
    env: Parameters<typeof runCloudflareScheduledJobs>[0],
  ) {
    await runCloudflareScheduledJobs(env);
  },
};

// Re-export only if the app uses the DO Queue and DO Tag Cache.
// @ts-expect-error generated output is not in the TypeScript project
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
