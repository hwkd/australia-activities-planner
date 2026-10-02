import type { Db, DbStatement } from "../../src/server/db";

/**
 * A Db that records statements as SQL text instead of running them, so app code (importActivities,
 * createUser) can produce a .sql file for `wrangler d1 execute`.
 */
export function sqlRecorder(): { db: Db; sql: () => string } {
  const out: string[] = [];
  const lit = (v: unknown) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : typeof v === "boolean" ? (v ? "1" : "0") : `'${String(v).replace(/'/g, "''")}'`);
  const render = (q: string, values: unknown[]) => {
    let i = 0;
    return q.replace(/\?/g, () => lit(values[i++])) + ";";
  };
  const statement = (q: string, values: unknown[] = []): DbStatement => ({
    bind: (...v) => statement(q, v),
    first: async () => null,
    all: async () => ({ results: [] }),
    run: async () => {
      out.push(render(q, values));
      return { meta: { changes: 1, last_row_id: 0 } };
    },
  });
  return {
    db: { prepare: (q) => statement(q), batch: async (s) => Promise.all(s.map((x) => x.run())) },
    sql: () => out.join("\n") + "\n",
  };
}
