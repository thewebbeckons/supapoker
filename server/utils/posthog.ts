import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function useServerPostHog(): PostHog {
  if (!client) {
    const config = useRuntimeConfig();
    const posthogConfig = config.public.posthog;

    if (!posthogConfig?.publicKey) {
      if (import.meta.dev) {
        console.warn(
          "NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
        );
      }
      return new PostHog("__placeholder__", { host: "https://us.i.posthog.com", flushAt: 1, flushInterval: 0 });
    }

    client = new PostHog(posthogConfig.publicKey, {
      host: posthogConfig.host,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}
