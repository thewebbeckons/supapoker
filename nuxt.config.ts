// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-06-14",
  devtools: {
    enabled: true,
  },
  modules: [
    "@nuxt/ui",
    "@nuxthub/core",
    "@vueuse/nuxt",
    "@nuxtjs/supabase",
    "@nuxt/hints",
  ],
  css: ["~/assets/css/main.css"],
  hub: {
    // NuxtHub is currently used for Cloudflare hosting only.
    db: false,
    kv: false,
    blob: false,
    cache: false,
  },
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      saveRedirectToCookie: true,
      exclude: ["/signup", "/", "/forgot-password", "/privacy", "/rooms/*"],
    },
  },
  nitro: {
    preset: "cloudflare_module",
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
