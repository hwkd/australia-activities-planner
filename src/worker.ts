import astro from "@astrojs/cloudflare/entrypoints/server";
import { refreshForecasts } from "./server/forecast";
import type { Db } from "./server/db";

/**
 * The Worker: Astro handles every request; the Cron Trigger in wrangler.jsonc refreshes the live
 * forecast in D1 (spec §11.1, tracker M16). Try it locally with `curl "http://localhost:4321/cdn-cgi/handler/scheduled"`.
 */
export default {
  fetch: astro.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      refreshForecasts(env.DB as unknown as Db).then((r) => {
        if (r.failed.length) console.warn("Forecast refresh: some areas failed", r.failed);
        else console.log(`Forecast refresh: ${r.days} days for ${r.areas} areas`);
      })
    );
  },
} satisfies ExportedHandler<Env>;
