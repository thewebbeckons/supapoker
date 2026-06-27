import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const profile = await ensureProfileForUser({
    id: user.id,
    email: user.email,
    name: user.name || user.email,
    image: user.image,
  });

  if (!profile) {
    throw createError({ statusCode: 500, message: "Unable to load profile." });
  }

  return {
    userId: profile.userId,
    user_id: profile.userId,
    name: profile.name,
    avatarPath: profile.avatarPath,
    avatar: avatarUrlFromPath(profile.avatarPath),
    email: user.email,
  };
});
