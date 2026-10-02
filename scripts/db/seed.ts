// Seeds a fresh D1 with the activities in db/seed/activities (published as they are).
//   npm run db:reset   (local)        or   npx tsx scripts/db/seed.ts --remote   (owner, first deploy only)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { activitySchema } from "../../src/content/schema";
import { importActivities } from "../../src/server/activities";
import { sqlRecorder } from "./sql";
import { d1 } from "./wrangler";

const remote = process.argv.includes("--remote");
const list = readdirSync("db/seed/activities")
  .filter((f) => f.endsWith(".json"))
  .map((f) => activitySchema.parse(JSON.parse(readFileSync(`db/seed/activities/${f}`, "utf8"))));
const { db, sql } = sqlRecorder();
await importActivities(db, list);
mkdirSync(".wrangler", { recursive: true });
writeFileSync(".wrangler/seed.sql", sql());
d1(["execute", "DB", "--file", ".wrangler/seed.sql", "--yes"], remote);
console.log(`Seeded ${list.length} activities (${remote ? "remote" : "local"}).`);
