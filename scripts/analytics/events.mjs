// Counts of the app's analytics events (spec §7, D7) from Workers Analytics Engine, for the last N days.
// Needs an API token with "Account Analytics: Read" and the account id:
//   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… node scripts/analytics/events.mjs [days=7]
// blob1 is the event name, blob2… its properties in the order of EVENT_SCHEMA in src/lib/analytics.ts
// (e.g. plan_add: blob2 = source, blob3 = dayType). Counts use _sample_interval, as Cloudflare advises.
const arg = Number(process.argv[2] ?? 7);
const days = Number.isFinite(arg) ? arg : 7;
const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
if (!account || !token)
  throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Account Analytics: Read).");
const sql = `SELECT blob1 AS event, blob2 AS detail, blob3 AS detail2, SUM(_sample_interval) AS count
  FROM australia_activities_events
  WHERE timestamp > NOW() - INTERVAL '${Math.max(1, Math.min(90, Math.floor(days)))}' DAY
  GROUP BY event, detail, detail2 ORDER BY event, count DESC FORMAT JSON`;
const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: sql,
});
if (!res.ok) throw new Error(`Analytics Engine SQL API: ${res.status} ${await res.text()}`);
const { data } = await res.json();
console.table(data);
