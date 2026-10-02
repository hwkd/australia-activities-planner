import type { APIRoute } from "astro";
import { serveMapFile } from "~/server/map";

/** Map tiles and fonts from R2 (spec §11.2): /map/sydney.pmtiles, /map/fonts/<stack>/<range>.pbf. */
export const GET: APIRoute = ({ params, request }) => serveMapFile(decodeURIComponent(params.key ?? ""), request);
