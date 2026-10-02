/**
 * The subset of Cloudflare D1 the server code uses. Production passes the real `env.DB`; unit tests
 * pass an adapter over Node's built-in SQLite (tests/unit/d1.ts), so the same SQL runs in both.
 */
export interface DbResult {
  meta: { changes: number; last_row_id: number };
}
export interface DbStatement {
  bind(...values: unknown[]): DbStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<DbResult>;
}
export interface Db {
  prepare(sql: string): DbStatement;
  batch(statements: DbStatement[]): Promise<unknown[]>;
}

export const nowIso = () => new Date().toISOString();

/** An error whose message is meant for the person using the admin (shown as-is). Anything else is a 500. */
export class UserError extends Error {}
