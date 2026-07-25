import { createPostHogDrain } from "evlog/posthog";

export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) return;

  nitroApp.hooks.hook("evlog:drain", createPostHogDrain());
});
