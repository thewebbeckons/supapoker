import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);
  if (!session?.user) {
    return { user: null, guestRoomId: null };
  }

  const anonymous = isAnonymousAppUser(session.user);
  const profile = anonymous
    ? await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, session.user.id) })
    : await ensureProfileForUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || session.user.email,
        image: session.user.image,
      });

  if (anonymous) await touchGuestActivity(session.user);

  return {
    user: {
      ...session.user,
      name: profile?.name ?? session.user.name,
      isAnonymous: anonymous,
    },
    guestRoomId: anonymous ? await getGuestOwnedRoomId(session.user.id) : null,
  };
});
