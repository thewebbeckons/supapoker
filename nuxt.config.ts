// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-12-01",
  devtools: {
    enabled: true,
  },
  modules: [
    "@nuxt/ui",
    "@vueuse/nuxt",
    "@nuxtjs/supabase",
    "@nuxt/hints",
  ],
  css: ["~/assets/css/main.css"],
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      saveRedirectToCookie: true,
      exclude: ["/signup", "/", "/forgot-password", "/privacy", "/rooms/*"],
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
