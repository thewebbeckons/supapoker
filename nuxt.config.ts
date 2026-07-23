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
    "evlog/nuxt",
  ],
  evlog: {
    env: {
      service: "supapoker",
    },
    transport: {
      enabled: false,
    },
    exclude: [
      "/_nuxt/**",
      "/api/_nuxt_icon/**",
      "/api/_evlog/**",
      "/favicon.ico",
      "/robots.txt",
    ],
    redact: {
      paths: [
        "authorization",
        "cookie",
        "set-cookie",
        "password",
        "secret",
        "token",
        "*_token",
        "*Token",
        "email",
        "body",
        "content",
        "room.name",
        "room.description",
        "story.title",
      ],
    },
  },
  $production: {
    evlog: {
      sampling: {
        rates: {
          debug: 0,
          info: 10,
          warn: 50,
          error: 100,
        },
        keep: [
          { status: 400 },
          { duration: 1000 },
        ],
      },
    },
  },
  ui: {
    colorMode: false,
  },
  css: ["~/assets/css/main.css"],
  hub: {
    db: {
      dialect: "sqlite",
      connection: {
        databaseId: "c1fc4e89-5177-47e8-b82b-2d1439d80425",
      },
    },
    kv: false,
    blob: {
      driver: "cloudflare-r2",
      binding: "BLOB",
      bucketName: "supapoker-avatars",
    },
    cache: false,
  },
  runtimeConfig: {
    betterAuthSecret: requireEnv("BETTER_AUTH_SECRET"),
    githubClientId: requireEnv("GITHUB_CLIENT_ID"),
    githubClientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
    turnstileVerifierUrl: process.env.TURNSTILE_VERIFIER_URL || "",
    maintenanceSecret: process.env.MAINTENANCE_SECRET || "",
    emailFrom: process.env.EMAIL_FROM || "SupaPoker <noreply@example.com>",
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "",
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || "",
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
