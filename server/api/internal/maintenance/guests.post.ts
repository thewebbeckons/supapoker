export default defineEventHandler(async (event) => {
  await requireMaintenanceSecret(event);

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
