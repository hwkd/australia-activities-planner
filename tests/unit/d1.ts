import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import type { Db, DbStatement } from "~/server/db";

/** A D1-shaped database over Node's built-in SQLite, with the real migrations applied (unit tests only). */
export function testDb(): Db {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync("db/migrations").sort()) sql.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  const statement = (query: string, values: unknown[] = []): DbStatement => {
    const args = () => values.map((v) => (typeof v === "boolean" ? Number(v) : v === undefined ? null : v)) as never[];
    return {
      bind: (...v) => statement(query, v),
      first: async <T,>() => (sql.prepare(query).get(...args()) as T) ?? null,
      all: async <T,>() => ({ results: sql.prepare(query).all(...args()) as T[] }),
      run: async () => {
        const r = sql.prepare(query).run(...args());
        return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
      },
    };
  };
  return {
    prepare: (q) => statement(q),
    batch: async (stmts) => {
      sql.exec("BEGIN");
      try {
        const out = [];
        for (const s of stmts) out.push(await s.run());
        sql.exec("COMMIT");
        return out;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
