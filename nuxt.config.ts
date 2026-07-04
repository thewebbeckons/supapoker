// https://nuxt.com/docs/api/configuration/nuxt-config
import process from "node:process";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

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
  css: ["~/assets/css/main.css"],
  hub: {
    db: {
      dialect: "sqlite",
      driver: "d1",
      connection: {
        databaseId: "c1fc4e89-5177-47e8-b82b-2d1439d80425"
      }
    },
    kv: false,
    blob: {
      driver: "cloudflare-r2",
      binding: "BLOB",
      bucketName: "supapoker-avatars"
    },
    cache: false,
  },
  runtimeConfig: {
    betterAuthSecret: requireEnv("BETTER_AUTH_SECRET"),
    githubClientId: requireEnv("GITHUB_CLIENT_ID"),
    githubClientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
    emailFrom: process.env.EMAIL_FROM || "SupaPoker <noreply@example.com>",
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "",
    },
  },
  nitro: {
    preset: "cloudflare_module",
    entry: "./cloudflare-entry.ts",
    experimental: {
      websocket: true,
    },
  },
  routeRules: {
    // Disable SSR for rooms to avoid hydration mismatches with real-time features
    "/rooms/**": { ssr: false },
  },
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/logo-pixel-dark.svg" },
      ],
    },
  },
});
