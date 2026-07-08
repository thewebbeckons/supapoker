import { eq } from "drizzle-orm";
import { db, schema } from "hub:db";
import { z } from "zod";

const avatarPathSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+\/avatar\.(gif|jpg|png|webp)$/, "Avatar path must be an uploaded avatar path.");

const profileSchema = z.object({
  name: z.string().min(2).max(80),
  avatarPath: avatarPathSchema.nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const body = await readValidatedBody(event, profileSchema.parse);
  if (body.avatarPath && !body.avatarPath.startsWith(`${user.id}/`)) {
    throw createError({ statusCode: 400, message: "Avatar path must be an uploaded avatar path." });
  }

  const now = new Date();

  const [profile] = await db
    .insert(schema.profiles)
    .values({
      userId: user.id,
      name: body.name.trim(),
      avatarPath: body.avatarPath ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: {
        name: body.name.trim(),
        ...(body.avatarPath !== undefined ? { avatarPath: body.avatarPath } : {}),
        updatedAt: now,
      },
    })
    .returning();

  if (!profile) {
    throw createError({ statusCode: 500, message: "Unable to update profile." });
  }

  await syncUserRoomSessions(event, user.id);

  return {
    userId: profile.userId,
    user_id: profile.userId,
    name: profile.name,
    avatarPath: profile.avatarPath,
    avatar: avatarUrlFromPath(profile.avatarPath),
    email: user.email,
  };
});
