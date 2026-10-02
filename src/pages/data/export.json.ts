import type { APIRoute } from "astro";
import { publishedExportInfo } from "~/server/activities";
import { publishedEventExport } from "~/server/eventsPublic";
import { contentMode, db } from "~/server/env";

/** Place and directions per activity and event for Add to your calendar (fetched when the sheet opens). */
export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ ...(await publishedExportInfo(db(), contentMode())), ...(await publishedEventExport(db())) }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
