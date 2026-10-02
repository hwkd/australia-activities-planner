import { defineMiddleware } from "astro:middleware";

/**
 * Security headers (tracker M11). The admin and its API are never cached, can't be framed, send no
 * referrer (invite links carry tokens) and, in production, run under a strict Content Security Policy.
 */
export const onRequest = defineMiddleware(async (ctx, next) => {
  const res = await next();
  const path = ctx.url.pathname;
  const h = res.headers;
  h.set("X-Content-Type-Options", "nosniff");
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    h.set("Cache-Control", "no-store");
    h.set("X-Frame-Options", "DENY");
    h.set("Referrer-Policy", "no-referrer");
    if (!import.meta.env.DEV)
      h.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      );
  } else {
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  return res;
});
