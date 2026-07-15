import type { H3Event } from "h3";

interface TurnstileVerification {
  success?: boolean;
  action?: string;
  "error-codes"?: string[];
}

const TURNSTILE_ACTION = "turnstile-spin-v1";

export async function verifyGuestRoomCreation(event: H3Event, token: string) {
  const config = useRuntimeConfig(event);
  const verifierUrl = getCloudflareEnv(event).TURNSTILE_VERIFIER_URL
    || config.turnstileVerifierUrl;
  if (!verifierUrl) {
    throw createError({
      statusCode: 503,
      message: "Guest room creation is temporarily unavailable.",
      data: { code: "TURNSTILE_UNAVAILABLE" },
    });
  }

  let result: TurnstileVerification;
  try {
    const response = await fetch(verifierUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        remoteip: getHeader(event, "cf-connecting-ip") || undefined,
      }),
    });

    if (!response.ok) throw new Error(`Verifier returned ${response.status}`);
    result = await response.json() as TurnstileVerification;
  } catch (error) {
    console.error("[turnstile] Managed verifier unavailable", { error });
    throw createError({
      statusCode: 503,
      message: "Guest room creation is temporarily unavailable.",
      data: { code: "TURNSTILE_UNAVAILABLE" },
    });
  }

  if (!result.success || result.action !== TURNSTILE_ACTION) {
    throw createError({
      statusCode: 403,
      message: "Please complete the security check and try again.",
      data: {
        code: "TURNSTILE_FAILED",
        errors: result["error-codes"] ?? [],
      },
    });
  }
}
