import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, captcha } from "better-auth/plugins";
import { useLogger } from "evlog";
import { toWebRequest, type H3Event } from "h3";
import { db } from "hub:db";
import * as schema from "../db/schema";
import { AUTH_TURNSTILE_ACTION } from "~/utils/turnstile";

function getRequestOrigin(event: H3Event) {
  const request = toWebRequest(event);
  return new URL(request.url).origin;
}

function isLocalOrigin(origin: string) {
  const { hostname } = new URL(origin);
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

/**
 * Whether this is a local deployment, decided from the *configured* site URL and
 * never from the request origin. The origin follows the Host header, so keying
 * anything security-sensitive off it would let a spoofed Host turn the
 * protection off in production. An unset site URL counts as non-local, so a
 * misconfigured deploy fails closed.
 */
function isLocalDeployment(event: H3Event) {
  const configured = useRuntimeConfig(event).public.siteUrl;
  if (!configured) return false;

  try {
    return isLocalOrigin(new URL(configured).origin);
  } catch {
    return false;
  }
}

function getSiteUrl(event: H3Event) {
  const config = useRuntimeConfig(event);
  const configured = config.public.siteUrl;
  const requestOrigin = getRequestOrigin(event);

  if (isLocalOrigin(requestOrigin)) {
    return requestOrigin;
  }

  if (configured) {
    return new URL(configured).origin;
  }

  if (!import.meta.dev) {
    throw createError({
      statusCode: 500,
      message: "Site URL is not configured.",
    });
  }

  return requestOrigin;
}

/**
 * Endpoints that mint a user, a session, or an outbound email. Each one is an
 * unbounded resource for an unauthenticated caller, so each requires a token.
 */
const CAPTCHA_ENDPOINTS = [
  "/sign-up/email",
  "/sign-in/email",
  "/sign-in/anonymous",
  "/request-password-reset",
];

/**
 * Matches no real route, which disables the captcha plugin without dropping it
 * from the `plugins` tuple — a conditional plugin list widens the array type and
 * breaks better-auth's inference of the anonymous plugin's `isAnonymous` field.
 */
const CAPTCHA_DISABLED_ENDPOINTS = ["/__captcha-disabled"];

export function createAuth(event: H3Event) {
  const config = useRuntimeConfig(event);
  const siteUrl = getSiteUrl(event);
  const turnstileSecretKey = getCloudflareEnv(event).TURNSTILE_SECRET_KEY
    || config.turnstileSecretKey;

  // Locally the captcha is skipped unless a secret is set, so dev works without
  // Turnstile. Everywhere else it stays on: a missing secret then fails closed
  // on the gated endpoints only, leaving session lookups working.
  //
  // `import.meta.dev` alone is not enough. `pnpm run dev` builds for production
  // and runs the output under Wrangler, so it is false there and the captcha
  // stayed on for every local run — which no local Turnstile test key can
  // satisfy, because siteverify reports a hostname that never matches.
  const isLocal = import.meta.dev || isLocalDeployment(event);
  const captchaEnabled = Boolean(turnstileSecretKey) || !isLocal;

  if (!captchaEnabled) {
    useLogger(event).warn("TURNSTILE_SECRET_KEY is not set; auth captcha is disabled.", {
      operation: "auth.captcha.disabled",
    });
  }

  return betterAuth({
    baseURL: `${siteUrl}/api/auth`,
    secret: config.betterAuthSecret,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        const email = await renderAuthEmail("ResetPasswordEmail", {
          email: user.email,
          actionUrl: url,
          appUrl: getSiteUrl(event),
        });

        await sendTransactionalEmail(event, {
          to: user.email,
          subject: "Reset your SupaPoker password",
          html: email.html,
          text: email.text,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        const email = await renderAuthEmail("ConfirmAccountEmail", {
          email: user.email,
          actionUrl: url,
          appUrl: getSiteUrl(event),
        });

        await sendTransactionalEmail(event, {
          to: user.email,
          subject: "Confirm your SupaPoker account",
          html: email.html,
          text: email.text,
        });
      },
    },
    socialProviders: {
      github: {
        clientId: config.githubClientId,
        clientSecret: config.githubClientSecret,
      },
    },
    plugins: [
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: turnstileSecretKey,
        endpoints: captchaEnabled ? CAPTCHA_ENDPOINTS : CAPTCHA_DISABLED_ENDPOINTS,
        expectedAction: AUTH_TURNSTILE_ACTION,
        allowedHostnames: [new URL(siteUrl).hostname],
      }),
      anonymous({
        generateName: () => "Guest",
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await linkAnonymousAppData(
            event,
            anonymousUser.user.id,
            newUser.user.id,
          );
        },
      }),
    ],
    // The default "memory" store is per-isolate on Workers, so it barely
    // constrains a distributed caller. D1 gives every isolate one shared window.
    rateLimit: {
      enabled: true,
      storage: "database",
    },
    advanced: {
      ipAddress: {
        // Default is x-forwarded-for, which Cloudflare may pass as a multi-hop
        // chain; better-auth refuses to trust those and buckets every caller
        // under a single "no-trusted-ip" key. cf-connecting-ip is single-valued
        // and set by the edge, overwriting anything the client sends.
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    trustedOrigins: [siteUrl],
  });
}

export async function getAppSession(event: H3Event) {
  const log = useLogger(event);
  log.set({ auth: { operation: "session.lookup" } });

  try {
    const auth = createAuth(event);
    const request = toWebRequest(event);
    const session = await auth.api.getSession({ headers: request.headers });

    log.set({
      auth: {
        operation: "session.lookup",
        outcome: session?.user ? "authenticated" : "anonymous",
        principal: session?.user
          ? (isAnonymousAppUser(session.user) ? "guest" : "registered")
          : "none",
      },
    });

    return session;
  } catch (error) {
    log.error(
      error instanceof Error ? error : String(error),
      { operation: "auth.session.lookup" },
    );
    throw error;
  }
}

export async function requireAppUser(event: H3Event) {
  const session = await getAppSession(event);
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Authentication required.",
    });
  }

  if (isAnonymousAppUser(session.user)) {
    await touchGuestActivity(session.user);
  } else {
    await ensureProfileForUser({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || session.user.email,
      image: session.user.image,
    });
  }

  return session.user;
}

export async function requireRegisteredAppUser(event: H3Event) {
  const user = await requireAppUser(event);
  if (isAnonymousAppUser(user)) {
    throw createError({
      statusCode: 403,
      message: "Create an account to access this feature.",
      data: { code: "ACCOUNT_REQUIRED" },
    });
  }
  return user;
}
