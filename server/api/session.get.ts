import { eq } from "drizzle-orm";
import { useLogger } from "evlog";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const log = useLogger(event);
  log.set({ session: { stage: "authenticate" } });

  const session = await getAppSession(event);
  if (!session?.user) {
    log.set({ session: { stage: "complete", principal: "none" } });
    return { user: null, guestRoomId: null };
  }

  const anonymous = isAnonymousAppUser(session.user);
  log.set({
    session: {
      stage: "profile",
      principal: anonymous ? "guest" : "registered",
    },
  });
  const profile = anonymous
    ? await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, session.user.id) })
    : await ensureProfileForUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || session.user.email,
        image: session.user.image,
      });

  if (anonymous) {
    log.set({ session: { stage: "guest-activity", principal: "guest" } });
    await touchGuestActivity(session.user);
  }

  log.set({
    session: {
      stage: "complete",
      principal: anonymous ? "guest" : "registered",
    },
  });

  return {
    user: {
      ...session.user,
      name: profile?.name ?? session.user.name,
      isAnonymous: anonymous,
    },
    guestRoomId: anonymous ? await getGuestOwnedRoomId(session.user.id) : null,
  };
});
