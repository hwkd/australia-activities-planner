// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// Rendered on demand on Cloudflare Workers, with content from D1 (tracker M11). React is used only
// for islands (implementation-plan.md §3.3) and the admin panel.
export default defineConfig({
  site: "https://sydney-weekend-finder.example",
  output: "server",
  // SWF_STATE points local D1 at a separate folder (end-to-end tests use .wrangler/e2e).
  adapter: cloudflare(process.env.SWF_STATE ? { persistState: { path: process.env.SWF_STATE } } : {}),
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [react()],
  // Mona Sans, trimmed to Sky Mode's widths and weights by scripts/fonts/trim.sh (tracker M3.2).
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Mona Sans",
      cssVariable: "--font-mona",
      fallbacks: ["system-ui", "sans-serif"],
      options: { variants: [{ src: ["./src/assets/fonts/mona-sans-sky.woff2"], weight: "500 800", style: "normal", display: "swap" }] }
    }
  ],
  vite: { plugins: [tailwindcss()] }
});
