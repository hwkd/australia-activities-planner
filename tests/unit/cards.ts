import { readdirSync, readFileSync } from "node:fs";
import { activitySchema } from "~/content/schema";
import { toCard } from "~/lib/content";

/** Every activity, parsed and validated, for unit tests. */
export const activities = readdirSync("db/seed/activities")
  .filter((f) => f.endsWith(".json"))
  .map((f) => activitySchema.parse(JSON.parse(readFileSync(`db/seed/activities/${f}`, "utf8"))));
export const cards = activities.map(toCard);
export const cardMap = new Map(cards.map((c) => [c.id, c]));
export const card = (id: string) => {
  const c = cardMap.get(id);
  if (!c) throw new Error(`no activity ${id}`);
  return c;
};
