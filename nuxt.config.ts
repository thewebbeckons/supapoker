// https://nuxt.com/docs/api/configuration/nuxt-config
import process from "node:process";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const githubAuthEnabled = process.env.NUXT_PUBLIC_GITHUB_AUTH_ENABLED !== "false";

export default defineNuxtConfig({
  compatibilityDate: "2026-06-14",
  devtools: {
    enabled: true,
  },
  modules: [
    "@nuxt/ui",
    "@nuxthub/core",
    "@vueuse/nuxt",
    "@nuxt/hints",
    "nuxt-email-renderer",
  ],
  ui: {
    colorMode: false,
  },
  css: ["~/assets/css/main.css"],
  hub: {
    db: {
      dialect: "sqlite",
      connection: {
        databaseId: requireEnv("NUXT_HUB_DATABASE_ID"),
      },
    },
    kv: false,
    blob: {
      driver: "cloudflare-r2",
      binding: "BLOB",
      bucketName: requireEnv("NUXT_HUB_BLOB_BUCKET_NAME"),
    },
    cache: false,
  },
  runtimeConfig: {
    betterAuthSecret: requireEnv("BETTER_AUTH_SECRET"),
    githubClientId: githubAuthEnabled ? requireEnv("GITHUB_CLIENT_ID") : "",
    githubClientSecret: githubAuthEnabled ? requireEnv("GITHUB_CLIENT_SECRET") : "",
    emailFrom: process.env.EMAIL_FROM || "SupaPoker <noreply@example.com>",
    public: {
      githubAuthEnabled,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "",
    },
  },
  nitro: {
    preset: "cloudflare_module",
    entry: "./cloudflare-entry.ts",
  },
  routeRules: {
    // Disable SSR for rooms to avoid hydration mismatches with real-time features
    "/rooms/**": { ssr: false },
  },
  app: {
    head: {
      htmlAttrs: {
        class: "dark",
      },
      meta: [
        { name: "color-scheme", content: "dark" },
        { name: "theme-color", content: "#09090b" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/logo-pixel-dark.svg" },
      ],
    },
  },
});
