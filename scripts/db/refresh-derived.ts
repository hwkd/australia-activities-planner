// Rebuilds the derived columns (card and export data) of every published activity and event from
// its published JSON, after a release adds fields to them (e.g. M16's forecast area, M17's location).
// Content doesn't change. Run after `db:migrate` when deploying:   npx tsx scripts/db/refresh-derived.ts [--remote]
import { writeFileSync, mkdirSync } from "node:fs";
import { activitySchema } from "../../src/content/schema";
import { eventSchema } from "../../src/content/eventSchema";
import { toCard } from "../../src/lib/content";
import { exportInfo } from "../../src/lib/calendarExport";
import { eventExportInfo, toEventCard } from "../../src/lib/events";
import { d1, d1Query } from "./wrangler";

const remote = process.argv.includes("--remote");
const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const sql: string[] = [];
for (const r of d1Query<{ id: string; published_json: string }>("SELECT id, published_json FROM activities WHERE published_json IS NOT NULL", remote)) {
  const a = activitySchema.parse(JSON.parse(r.published_json));
  sql.push(`UPDATE activities SET published_card = ${q(JSON.stringify(toCard(a)))}, published_export = ${q(JSON.stringify(exportInfo(a)))} WHERE id = ${q(r.id)};`);
}
for (const r of d1Query<{ id: string; published_json: string }>("SELECT id, published_json FROM events WHERE published_json IS NOT NULL", remote)) {
  const e = eventSchema.parse(JSON.parse(r.published_json));
  sql.push(`UPDATE events SET published_card = ${q(JSON.stringify(toEventCard(e)))}, published_export = ${q(JSON.stringify(eventExportInfo(e)))} WHERE id = ${q(r.id)};`);
}
mkdirSync(".wrangler", { recursive: true });
writeFileSync(".wrangler/refresh.sql", sql.join("\n") + "\n");
if (sql.length) d1(["execute", "DB", "--file", ".wrangler/refresh.sql", "--yes"], remote);
console.log(`Refreshed ${sql.length} published activities and events (${remote ? "remote" : "local"}).`);
