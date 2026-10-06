import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { eventFields } from "~/lib/analytics";
import { contentMode } from "~/server/env";
import { readCapped } from "~/server/body";

/** An event is a few dozen bytes. */
const MAX_BYTES = 1024;

/**
 * Analytics events (spec §7, D7): one of the app's own events, written to Workers Analytics Engine
 * (binding `EVENTS`) as blob1 = event name, blob2… = its properties in the order in
 * src/lib/analytics.ts, double1 = 1. Nothing about the visitor is stored: no IP address, no user agent,
 * no cookie. Only `text/plain` bodies are taken (what `sendBeacon` sends), so Astro's origin check
 * (security.checkOrigin) always applies and refuses posts from other sites' pages with a 403. A script
 * outside a browser can still send events, so the counts are indicative, not audited. Only production
 * (CONTENT_MODE "published") writes; previews and local runs answer the same but store nothing.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!(request.headers.get("Content-Type") ?? "").toLowerCase().startsWith("text/plain")) return new Response(null, { status: 415 });
  if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BYTES) return new Response(null, { status: 413 });
  const body = await readCapped(request, MAX_BYTES);
  if (body === null) return new Response(null, { status: 413 });
  let fields: string[] | null = null;
  try {
    fields = eventFields(JSON.parse(body));
  } catch {
    /* not JSON */
  }
  if (!fields) return new Response(null, { status: 400 });
  if (contentMode() === "published") {
    try {
      env.EVENTS.writeDataPoint({ indexes: [fields[0]], blobs: fields, doubles: [1] });
    } catch {
      /* analytics must never fail a request */
    }
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};
