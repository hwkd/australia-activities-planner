import type { APIRoute } from "astro";
import { handleAdmin } from "~/server/adminApi";
import { contentMode, db } from "~/server/env";

/** The admin API: see src/server/adminApi.ts. */
export const ALL: APIRoute = ({ request, params, url }) =>
  handleAdmin(request, params.path ?? "", {
    db: db(),
    mode: contentMode(),
    origin: url.origin,
    ip: request.headers.get("CF-Connecting-IP") ?? "local",
  });
