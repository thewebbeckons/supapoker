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

export default defineEventHandler(async (event) => {
  const expected = getCloudflareEnv(event).MAINTENANCE_SECRET
    || useRuntimeConfig(event).maintenanceSecret;
  const received = getHeader(event, "x-supapoker-maintenance-secret") ?? "";

  if (!expected) {
    throw createError({ statusCode: 503, message: "Maintenance is not configured." });
  }
  if (!received || !await secretsMatch(received, expected)) {
    throw createError({ statusCode: 404, message: "Not found." });
  }

  const totals = { processed: 0, deletedUsers: 0, deletedRooms: 0, failedUsers: 0 };
  for (let batch = 0; batch < 10; batch += 1) {
    const result = await cleanupStaleGuests(event);
    totals.processed += result.processed;
    totals.deletedUsers += result.deletedUsers;
    totals.deletedRooms += result.deletedRooms;
    totals.failedUsers += result.failedUsers;
    if (!result.hasMore) break;
  }

  return totals;
});
