import type { APIRoute } from "astro";
import { readForecast } from "~/server/forecast";
import { db } from "~/server/env";

/** The live forecast for every area (spec §11.1), cached for an hour; empty until the job has run. */
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await readForecast(db())), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
