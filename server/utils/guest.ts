import { and, eq, gt, isNull, lt, notExists, or } from "drizzle-orm";
import type { H3Event } from "h3";
import { db, schema } from "hub:db";

const GUEST_ACTIVITY_TOUCH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STALE_GUEST_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 100;

export function isAnonymousAppUser(user: { isAnonymous?: boolean | null }) {
  return user.isAnonymous === true;
}

export async function getGuestOwnedRoomId(userId: string) {
  const ownership = await db.query.guestRoomOwnerships.findFirst({
    where: eq(schema.guestRoomOwnerships.userId, userId),
  });
  return ownership?.roomId ?? null;
}

export async function touchGuestActivity(user: { id: string; isAnonymous?: boolean | null }) {
  if (!isAnonymousAppUser(user)) return;

  const now = new Date();
  const touchBefore = new Date(now.getTime() - GUEST_ACTIVITY_TOUCH_INTERVAL_MS);
  await db
    .update(schema.profiles)
    .set({ lastActiveAt: now, updatedAt: now })
    .where(and(
      eq(schema.profiles.userId, user.id),
      or(isNull(schema.profiles.lastActiveAt), lt(schema.profiles.lastActiveAt, touchBefore)),
    ));
}

export async function linkAnonymousAppData(
  event: H3Event,
  anonymousUserId: string,
  permanentUserId: string,
) {
  if (anonymousUserId === permanentUserId) return;

  const [profile, participants, voteSnapshots, ownedRoom] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(schema.profiles.userId, anonymousUserId) }),
    db.select().from(schema.roomParticipants).where(eq(schema.roomParticipants.userId, anonymousUserId)),
    db.select().from(schema.storyVoteSnapshots).where(eq(schema.storyVoteSnapshots.userId, anonymousUserId)),
    db.query.guestRoomOwnerships.findFirst({
      where: eq(schema.guestRoomOwnerships.userId, anonymousUserId),
    }),
  ]);

  const affectedRoomIds = new Set(participants.map(participant => participant.roomId));
  if (ownedRoom) affectedRoomIds.add(ownedRoom.roomId);

  const statements: any[] = [];

  if (profile) {
    statements.push(
      db.insert(schema.profiles).values({
        userId: permanentUserId,
        name: profile.name,
        avatarPath: profile.avatarPath,
        lastActiveAt: null,
        createdAt: profile.createdAt,
        updatedAt: new Date(),
      }).onConflictDoNothing(),
    );
  }

  for (const participant of participants) {
    statements.push(
      db.insert(schema.roomParticipants).values({
        roomId: participant.roomId,
        userId: permanentUserId,
        joinedAt: participant.joinedAt,
      }).onConflictDoNothing(),
    );
  }

  for (const snapshot of voteSnapshots) {
    statements.push(
      db.insert(schema.storyVoteSnapshots).values({
        storyId: snapshot.storyId,
        userId: permanentUserId,
        voteValue: snapshot.voteValue,
        createdAt: snapshot.createdAt,
      }).onConflictDoNothing(),
    );
  }

  if (ownedRoom) {
    statements.push(
      db.update(schema.rooms)
        .set({ adminUserId: permanentUserId, updatedAt: new Date() })
        .where(and(
          eq(schema.rooms.id, ownedRoom.roomId),
          eq(schema.rooms.adminUserId, anonymousUserId),
        )),
    );
  }

  statements.push(
    db.delete(schema.storyVoteSnapshots).where(eq(schema.storyVoteSnapshots.userId, anonymousUserId)),
    db.delete(schema.roomParticipants).where(eq(schema.roomParticipants.userId, anonymousUserId)),
    db.delete(schema.profiles).where(eq(schema.profiles.userId, anonymousUserId)),
    db.delete(schema.guestRoomOwnerships).where(eq(schema.guestRoomOwnerships.userId, anonymousUserId)),
  );

  await db.batch(statements as [any, ...any[]]);
  await Promise.all(
    [...affectedRoomIds].map(roomId =>
      getRoomSessionStub(event, roomId).transferUserIdentity(anonymousUserId, permanentUserId),
    ),
  );
  await Promise.all([...affectedRoomIds].map(roomId => syncRoomSession(event, roomId)));
}

export async function cleanupStaleGuests(event: H3Event) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_GUEST_AGE_MS);
  const hasActiveSession = db
    .select({ id: schema.session.id })
    .from(schema.session)
    .where(and(
      eq(schema.session.userId, schema.user.id),
      gt(schema.session.expiresAt, now),
    ));

  const candidates = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.user.id))
    .where(and(
      eq(schema.user.isAnonymous, true),
      notExists(hasActiveSession),
      or(
        lt(schema.profiles.lastActiveAt, staleBefore),
        and(isNull(schema.profiles.lastActiveAt), lt(schema.user.createdAt, staleBefore)),
      ),
    ))
    .limit(CLEANUP_BATCH_SIZE);

  let deletedUsers = 0;
  let deletedRooms = 0;
  let failedUsers = 0;

  for (const candidate of candidates) {
    const [ownedRoom, participantRows] = await Promise.all([
      db.query.guestRoomOwnerships.findFirst({
        where: eq(schema.guestRoomOwnerships.userId, candidate.id),
      }),
      db.select({ roomId: schema.roomParticipants.roomId })
        .from(schema.roomParticipants)
        .where(eq(schema.roomParticipants.userId, candidate.id)),
    ]);

    const ownedStub = ownedRoom ? getRoomSessionStub(event, ownedRoom.roomId) : null;
    if (ownedStub) await ownedStub.beginDelete();

    try {
      await db.delete(schema.user).where(eq(schema.user.id, candidate.id));
    } catch (error) {
      failedUsers += 1;
      if (ownedStub) await ownedStub.cancelDelete();
      console.error("[guest-cleanup] Failed to delete stale guest", { userId: candidate.id, error });
      continue;
    }

    deletedUsers += 1;
    if (ownedStub) {
      deletedRooms += 1;
      try {
        await ownedStub.finalizeDelete();
      } catch (error) {
        console.error("[guest-cleanup] Failed to finalize room deletion", {
          roomId: ownedRoom?.roomId,
          error,
        });
      }
    }

    const survivingRoomIds = new Set(
      participantRows
        .map(row => row.roomId)
        .filter(roomId => roomId !== ownedRoom?.roomId),
    );
    await Promise.all([...survivingRoomIds].map(roomId => syncRoomSession(event, roomId)));
  }

  return {
    processed: candidates.length,
    deletedUsers,
    deletedRooms,
    failedUsers,
    hasMore: candidates.length === CLEANUP_BATCH_SIZE,
  };
}
