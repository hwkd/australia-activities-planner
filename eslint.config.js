import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/", ".astro/", "design/", "node_modules/", "playwright-report/", "test-results/", ".wrangler/", "worker-configuration.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["scripts/**/*.{js,mjs,ts}", "*.config.{js,mjs,ts}"],
    languageOptions: { globals: { console: "readonly", process: "readonly", URL: "readonly", URLSearchParams: "readonly", fetch: "readonly", setTimeout: "readonly", Buffer: "readonly" } }
  },
  {
    // These scripts drive Playwright and run some of their code inside the page.
    files: ["scripts/perf/**/*.mjs", "scripts/theme/**/*.mjs"],
    languageOptions: {
      globals: { document: "readonly", Image: "readonly", performance: "readonly", PerformanceObserver: "readonly", requestAnimationFrame: "readonly" }
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules }
  },
  {
    // Visitor-facing text lives in src/strings/en-AU.ts (spec §7, tracker M12.1): no words written
    // straight into island markup or accessible names. The admin is English-only and exempt.
    files: ["src/components/**/*.tsx"],
    ignores: ["src/components/admin/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "JSXText[value=/[A-Za-z]/]", message: "Put visitor-facing text in src/strings/en-AU (t.…)." },
        {
          selector: "JSXAttribute[name.name=/^(aria-label|aria-description|title|alt|placeholder)$/] > Literal[value=/[A-Za-z]/]",
          message: "Put visitor-facing text in src/strings/en-AU (t.…)."
        }
      ]
    }
  }
];
