// Creates an admin account directly in D1 (the only way to create the first owner; editors are invited).
//   ADMIN_PASSWORD=… npx tsx scripts/db/create-user.ts --email you@example.com --name "Your Name" --role owner [--remote]
// The password comes from ADMIN_PASSWORD so it never appears in shell history or process lists.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { hashPassword, normalEmail, passwordProblem, validEmail } from "../../src/server/auth";
import { d1 } from "./wrangler";

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const email = normalEmail(arg("email") ?? "");
const name = (arg("name") ?? "").trim();
const role = arg("role") === "editor" ? "editor" : "owner";
const password = process.env.ADMIN_PASSWORD ?? "";
const remote = process.argv.includes("--remote");
const problem = !validEmail(email) ? "Give --email." : !name ? "Give --name." : passwordProblem(password);
if (problem) {
  console.error(problem.startsWith("Use") ? `ADMIN_PASSWORD: ${problem}` : problem);
  process.exit(1);
}
const esc = (s: string) => `'${s.replace(/'/g, "''")}'`;
mkdirSync(".wrangler", { recursive: true });
const file = ".wrangler/create-user.sql";
writeFileSync(file, `INSERT INTO users (email, name, role, password_hash) VALUES (${esc(email)}, ${esc(name)}, '${role}', ${esc(await hashPassword(password))});\n`);
try {
  d1(["execute", "DB", "--file", file, "--yes"], remote);
} finally {
  rmSync(file, { force: true });
}
console.log(`Created ${role} ${email} (${remote ? "remote" : "local"}).`);
