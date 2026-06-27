// https://nuxt.com/docs/api/configuration/nuxt-config
declare const process: {
  env: Record<string, string | undefined>;
};

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
  ],
  css: ["~/assets/css/main.css"],
  hub: {
    db: "sqlite",
    kv: false,
    blob: true,
    cache: false,
  },
  runtimeConfig: {
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || "",
    githubClientId: process.env.GITHUB_CLIENT_ID || "",
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
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
