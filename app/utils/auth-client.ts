import { createAuthClient } from "better-auth/vue";

type AuthClient = ReturnType<typeof createAuthClient>;

let client: AuthClient | null = null;

function getAuthBaseUrl() {
  const workerEnv = (globalThis as { __env__?: Record<string, string> }).__env__;
  const configuredSiteUrl = workerEnv?.NUXT_PUBLIC_SITE_URL || process.env.NUXT_PUBLIC_SITE_URL;
  const origin = import.meta.client ? window.location.origin : configuredSiteUrl || "https://supapoker.dev";

  return `${origin.replace(/\/$/, "")}/api/auth`;
}

function getAuthClient() {
  client ??= createAuthClient({
    baseURL: getAuthBaseUrl(),
  });

  return client;
}

export const authClient = new Proxy({} as AuthClient, {
  get(_target, key, receiver) {
    return Reflect.get(getAuthClient(), key, receiver);
  },
});
