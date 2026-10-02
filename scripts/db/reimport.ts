// Replaces one activity's draft and published copy with its seed file (local development only, e.g.
// after editing db/seed/activities/<id>.json by hand).   npx tsx scripts/db/reimport.ts <id>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { activitySchema } from "../../src/content/schema";
import { toCard } from "../../src/lib/content";
import { exportInfo } from "../../src/lib/calendarExport";
import { d1 } from "./wrangler";

const id = process.argv[2];
if (!id || process.argv.includes("--remote")) throw new Error("Usage: npx tsx scripts/db/reimport.ts <id>   (local only)");
const a = activitySchema.parse(JSON.parse(readFileSync(`db/seed/activities/${id}.json`, "utf8")));
const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const json = JSON.stringify(a);
mkdirSync(".wrangler", { recursive: true });
writeFileSync(
  ".wrangler/reimport.sql",
  `UPDATE activities SET draft_json = ${q(json)}, published_json = ${q(json)}, published_card = ${q(JSON.stringify(toCard(a)))}, published_export = ${q(JSON.stringify(exportInfo(a)))}, version = version + 1 WHERE id = ${q(id)};\n`
);
d1(["execute", "DB", "--file", ".wrangler/reimport.sql", "--yes"]);
console.log(`Re-imported ${id} from its seed file (local).`);
