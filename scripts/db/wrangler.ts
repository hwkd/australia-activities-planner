import { execFileSync } from "node:child_process";

/**
 * Runs `wrangler d1 …` against the local D1, or a separate one when SWF_STATE is set (end-to-end
 * tests use .wrangler/e2e so they never touch your development data), or the real one with --remote.
 */
export function d1(args: string[], remote = false) {
  const where = remote ? ["--remote"] : ["--local", ...(process.env.SWF_STATE ? ["--persist-to", process.env.SWF_STATE] : [])];
  execFileSync("npx", ["wrangler", "d1", ...args.slice(0, 2), ...where, ...args.slice(2)], { stdio: "inherit" });
}

/** Runs one read-only SQL query and returns its rows (`wrangler d1 execute --json`). */
export function d1Query<T = Record<string, unknown>>(sql: string, remote = false): T[] {
  const where = remote ? ["--remote"] : ["--local", ...(process.env.SWF_STATE ? ["--persist-to", process.env.SWF_STATE] : [])];
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "DB", ...where, "--json", "--command", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  return (JSON.parse(out) as { results: T[] }[]).flatMap((r) => r.results);
}
