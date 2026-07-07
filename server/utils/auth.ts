import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { toWebRequest, type H3Event } from "h3";
import { db } from "hub:db";
import * as schema from "../db/schema";

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

export function createAuth(event: H3Event) {
  const config = useRuntimeConfig(event);

  return betterAuth({
    baseURL: `${getSiteUrl(event)}/api/auth`,
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
    trustedOrigins: [getSiteUrl(event)],
  });
}

export async function getAppSession(event: H3Event) {
  const auth = createAuth(event);
  const request = toWebRequest(event);
  return auth.api.getSession({ headers: request.headers });
}

export async function requireAppUser(event: H3Event) {
  const session = await getAppSession(event);
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Authentication required.",
    });
  }

  await ensureProfileForUser({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || session.user.email,
    image: session.user.image,
  });

  return session.user;
}
