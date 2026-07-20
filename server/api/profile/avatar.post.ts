import { useLogger } from "evlog";
import { blob } from "hub:blob";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  const log = useLogger(event);
  const user = await requireRegisteredAppUser(event);
  const contentLength = Number(getRequestHeader(event, "content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_AVATAR_REQUEST_BYTES) {
    throw createError({ statusCode: 413, message: "Avatar upload request is too large." });
  }

  const parts = await readMultipartFormData(event);
  const file = parts?.find(part => part.name === "avatar");

  if (!file?.data || !file.type) {
    throw createError({ statusCode: 400, message: "Avatar file is required." });
  }

  const validationError = validateProcessedAvatar(file.data, file.type);
  if (validationError) {
    throw createError({ statusCode: 400, message: validationError });
  }

  const pathname = `${user.id}/avatar.webp`;
  await blob.put(`avatars/${pathname}`, file.data, {
    contentType: "image/webp",
    access: "public",
  });

  const now = new Date();

  await db
    .insert(schema.profiles)
    .values({
      userId: user.id,
      name: user.name || user.email,
      avatarPath: pathname,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: {
        avatarPath: pathname,
        updatedAt: now,
      },
    });

  try {
    await blob.del([
      `avatars/${user.id}/avatar.gif`,
      `avatars/${user.id}/avatar.jpg`,
      `avatars/${user.id}/avatar.png`,
    ]);
  } catch (error) {
    log.error(
      error instanceof Error ? error : String(error),
      { operation: "profile.avatar.legacy-cleanup" },
    );
  }

  await syncUserRoomSessions(event, user.id);

  return {
    avatarPath: pathname,
    avatar: avatarUrlFromPath(pathname, now),
  };
});
