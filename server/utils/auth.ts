import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { toWebRequest, type H3Event } from "h3";
import { db } from "hub:db";
import * as schema from "../db/schema";

function getSiteUrl(event: H3Event) {
  const config = useRuntimeConfig(event);
  const configured = config.public.siteUrl;
  if (configured) return configured;

  const request = toWebRequest(event);
  return new URL(request.url).origin;
}

export function createAuth(event: H3Event) {
  const config = useRuntimeConfig(event);

  return betterAuth({
    baseURL: `${getSiteUrl(event)}/api/auth`,
    secret: config.betterAuthSecret || "development-secret-change-before-production",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendTransactionalEmail(event, {
          to: user.email,
          subject: "Reset your SupaPoker password",
          html: `<p>Use this link to reset your SupaPoker password:</p><p><a href="${url}">Reset password</a></p>`,
          text: `Use this link to reset your SupaPoker password: ${url}`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendTransactionalEmail(event, {
          to: user.email,
          subject: "Confirm your SupaPoker account",
          html: `<p>Use this link to confirm your SupaPoker account:</p><p><a href="${url}">Confirm account</a></p>`,
          text: `Use this link to confirm your SupaPoker account: ${url}`,
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
