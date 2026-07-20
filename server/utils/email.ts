import { useLogger } from "evlog";
import type { H3Event } from "h3";

function parseFrom(value: string) {
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (!match) return { email: value.trim(), name: "SupaPoker" };

  return {
    name: match[1]?.trim() || "SupaPoker",
    email: match[2]?.trim() || value.trim(),
  };
}

export async function sendTransactionalEmail(
  event: H3Event,
  input: { to: string; subject: string; html: string; text: string },
) {
  const config = useRuntimeConfig(event);
  const from = parseFrom(config.emailFrom);
  const env = getCloudflareEnv(event);

  if (!env.EMAIL) {
    useLogger(event).error(
      "Email binding is unavailable",
      { operation: "email.send" },
    );

    throw createError({
      statusCode: 500,
      message: "Email service is not configured.",
    });
  }

  await env.EMAIL.send({
    to: input.to,
    from,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
