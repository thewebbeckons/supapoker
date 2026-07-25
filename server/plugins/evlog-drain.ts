import { createPostHogDrain } from "evlog/posthog";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("evlog:drain", createPostHogDrain());
});
