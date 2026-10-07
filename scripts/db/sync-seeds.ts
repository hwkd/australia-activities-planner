// Pushes the seed files in db/seed/activities to the database where they differ from the published
// copy: draft and published become the seed, the derived card and export columns are refreshed, the
// version goes up and an "import" revision is recorded. An activity with unpublished admin edits (its
// draft differs from its published copy) is skipped and reported, so nobody's work is overwritten.
//   npx tsx scripts/db/sync-seeds.ts [--remote] [--dry-run]
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { activitySchema } from "../../src/content/schema";
import { toCard } from "../../src/lib/content";
import { exportInfo } from "../../src/lib/calendarExport";
import { d1, d1Query } from "./wrangler";
import { sameData } from "../../src/lib/sameData";

const remote = process.argv.includes("--remote");
const dry = process.argv.includes("--dry-run");
const SEED = "db/seed/activities";
const q = (v: string) => `'${v.replace(/'/g, "''")}'`;

const rows = new Map(
  d1Query<{ id: string; version: number; draft_json: string; published_json: string | null }>(
    "SELECT id, version, draft_json, published_json FROM activities",
    remote,
  ).map((r) => [r.id, r]),
);
const now = new Date().toISOString();
const sql: string[] = [];
const changed: string[] = [],
  skipped: string[] = [],
  missing: string[] = [];
for (const f of readdirSync(SEED)
  .filter((x) => x.endsWith(".json"))
  .sort()) {
  const a = activitySchema.parse(JSON.parse(readFileSync(`${SEED}/${f}`, "utf8")));
  const row = rows.get(a.id);
  if (!row) {
    missing.push(a.id);
    continue;
  }
  const draft = JSON.parse(row.draft_json);
  const published = row.published_json ? JSON.parse(row.published_json) : null;
  if (published && sameData(published, a) && sameData(draft, a)) continue;
  if (!published || !sameData(draft, published)) {
    skipped.push(a.id);
    continue;
  }
  const json = JSON.stringify(a);
  const next = row.version + 1;
  sql.push(
    `UPDATE activities SET name = ${q(a.name)}, area = ${q(a.area)}, category = ${q(a.category)}, status = ${q(a.status)}, draft_json = ${q(json)}, published_json = ${q(json)}, published_status = ${q(a.status)}, published_card = ${q(JSON.stringify(toCard(a)))}, published_export = ${q(JSON.stringify(exportInfo(a)))}, version = ${next}, updated_at = ${q(now)}, published_at = ${q(now)} WHERE id = ${q(a.id)} AND version = ${row.version};`,
    `INSERT INTO revisions (activity_id, version, action, json) VALUES (${q(a.id)}, ${next}, 'import', ${q(json)});`,
  );
  changed.push(a.id);
}
console.log(
  `${remote ? "Remote" : "Local"}: ${changed.length} to update${changed.length ? ` (${changed.join(", ")})` : ""}.`,
);
if (skipped.length) console.log(`Skipped, unpublished admin edits or never published: ${skipped.join(", ")}.`);
if (missing.length) console.log(`Not in the database (add them in the admin): ${missing.join(", ")}.`);
if (!dry && sql.length) {
  mkdirSync(".wrangler", { recursive: true });
  writeFileSync(".wrangler/sync-seeds.sql", sql.join("\n"));
  d1(["execute", "DB", "--file", ".wrangler/sync-seeds.sql", "--yes"], remote);
  console.log("Done.");
}
