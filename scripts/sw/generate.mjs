// Generates dist/sw.js after `astro build` (implementation-plan.md §3.1).
// @vite-pwa/astro isn't used because it doesn't support Astro 7 yet.
import { generateSW } from "workbox-build";

// Workbox plugin (serialised into sw.js): treat a 5xx as a network failure so NetworkFirst tries the
// cache; if nothing is cached, hand back the server's own error response.
const serverErrorFallback = {
  fetchDidSucceed: async ({ response, state }) => {
    if (response.status < 500) return response;
    state.serverError = response;
    throw new Error(`Server error ${response.status}`);
  },
  handlerDidError: async ({ state }) => state.serverError
};

const { count, size, warnings } = await generateSW({
  globDirectory: "dist/client",
  globPatterns: ["**/*.{html,js,css,woff2,svg,webmanifest,json}"],
  // Editor tools (dev builds only) are never offline-cached.
  // The content admin is never cached for visitors; the map (MapLibre and its worker, ~300 KB) loads
  // only when someone opens a map, and needs the network for tiles anyway.
  globIgnores: ["_astro/AdminApp*", "_astro/MapView*", "_astro/maplibreWorker*", "_astro/maplibre*"],
  swDest: "dist/client/sw.js",
  navigateFallback: undefined,
  // Static files are precached. Pages are rendered from D1 on each request, so they're cached when
  // visited (network-first, below); the layout also warms `/` and `/plan` once the worker is ready (AC 14).
  ignoreURLParametersMatching: [/.*/],
  directoryIndex: "index.html",
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  sourcemap: false,
  runtimeCaching: [
    // Pages are rendered from D1, so they're network-first; the admin is never cached. A server error
    // (e.g. D1 unreachable) falls back to the cached copy, or shows the server's error page if there's none.
    { urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/admin"), handler: "NetworkFirst", options: { cacheName: "pages", networkTimeoutSeconds: 3, matchOptions: { ignoreSearch: true }, plugins: [serverErrorFallback] } },
    // Place and directions for calendar export, so Add to your calendar works offline too.
    { urlPattern: ({ url }) => url.pathname === "/data/export.json", handler: "NetworkFirst", options: { cacheName: "data", networkTimeoutSeconds: 3, plugins: [serverErrorFallback] } }
  ]
});
for (const w of warnings) console.warn(w);
console.log(`Service worker: precached ${count} files, ${(size / 1024).toFixed(1)} KB`);
