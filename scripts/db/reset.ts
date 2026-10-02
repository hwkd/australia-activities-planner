// Recreates the local D1 from the migrations and the seed activities.
//   npm run db:reset            (development data in .wrangler/state)
//   SWF_STATE=.wrangler/e2e …   (a separate database, used by the end-to-end tests)
import { rmSync } from "node:fs";
import { d1 } from "./wrangler";

const state = process.env.SWF_STATE ?? ".wrangler/state";
rmSync(`${state}/v3/d1`, { recursive: true, force: true });
d1(["migrations", "apply", "DB"]);
await import("./seed");
