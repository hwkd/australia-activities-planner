import { env } from "cloudflare:workers";

/**
 * The map view's files in R2 (spec §11.2, tracker M17): the Sydney tile archive and label fonts,
 * bound as MAP. Without them, maps aren't offered and activity pages show their numbered list instead.
 */
const bucket = (): R2Bucket | undefined => (env as { MAP?: R2Bucket }).MAP;

let known: { at: number; ok: boolean } | null = null;
/** Whether the tiles are uploaded; checked at most every 5 minutes per Worker instance. */
export async function mapAvailable(): Promise<boolean> {
  if (known && Date.now() - known.at < 300_000) return known.ok;
  const ok = await bucket()
    ?.head("sydney.pmtiles")
    .then((o) => !!o)
    .catch(() => false);
  known = { at: Date.now(), ok: !!ok };
  return !!ok;
}

/** Serves one map file, with byte ranges (the tile archive is read in ranges by the browser). */
export async function serveMapFile(key: string, req: Request): Promise<Response> {
  const b = bucket();
  // Font stacks have spaces ("Noto Sans Regular"); they're stored with underscores.
  key = key.replace(/ /g, "_");
  if (!b || !/^(sydney\.pmtiles|fonts\/[A-Za-z_]+\/\d+-\d+\.pbf)$/.test(key)) return new Response("Not found", { status: 404 });
  const range = parseRange(req.headers.get("Range"));
  const obj = await b.get(key, range ? { range } : undefined);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers({
    "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
    "Cache-Control": "public, max-age=86400",
    "Accept-Ranges": "bytes",
    ETag: obj.httpEtag,
  });
  if (range && "body" in obj) {
    const { offset, length } = range as { offset: number; length: number };
    const end = Math.min(offset + length, obj.size) - 1;
    headers.set("Content-Range", `bytes ${offset}-${end}/${obj.size}`);
    headers.set("Content-Length", String(end - offset + 1));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(obj.size));
  return new Response("body" in obj ? obj.body : null, { headers });
}

/** "bytes=0-16383" → { offset, length }. Only single, closed ranges (all the PMTiles client asks for). */
export function parseRange(h: string | null): { offset: number; length: number } | null {
  const m = h && /^bytes=(\d+)-(\d+)$/.exec(h.trim());
  if (!m) return null;
  const offset = Number(m[1]), end = Number(m[2]);
  return end >= offset ? { offset, length: end - offset + 1 } : null;
}
