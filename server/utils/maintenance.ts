import type { H3Event } from "h3";

async function secretsMatch(received: string, expected: string) {
  const encoder = new TextEncoder();
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const receivedBytes = new Uint8Array(receivedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let mismatch = 0;
  for (let index = 0; index < receivedBytes.length; index += 1) {
    mismatch |= receivedBytes[index]! ^ expectedBytes[index]!;
  }
  return mismatch === 0;
}

/**
 * Guards internal maintenance endpoints, which are only ever reached from the
 * scheduled handler. Rejects with 404 rather than 401 so the endpoints are not
 * discoverable by probing.
 */
export async function requireMaintenanceSecret(event: H3Event) {
  const expected = getCloudflareEnv(event).MAINTENANCE_SECRET
    || useRuntimeConfig(event).maintenanceSecret;
  const received = getHeader(event, "x-supapoker-maintenance-secret") ?? "";

  if (!expected) {
    throw createError({ statusCode: 503, message: "Maintenance is not configured." });
  }
  if (!received || !await secretsMatch(received, expected)) {
    throw createError({ statusCode: 404, message: "Not found." });
  }
}
