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
  ],
  css: ['~/assets/css/main.css'],
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: ["/signup", "/", "/forgot-password"],
    },
  },
});