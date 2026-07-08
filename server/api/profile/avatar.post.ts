import { blob } from "hub:blob";
import { db, schema } from "hub:db";

const MAX_AVATAR_BYTES = 1024 * 1024;
const MAX_AVATAR_REQUEST_BYTES = MAX_AVATAR_BYTES + 64 * 1024;
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const extensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event);
  const contentLength = Number(getRequestHeader(event, "content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_AVATAR_REQUEST_BYTES) {
    throw createError({ statusCode: 413, message: "Avatar upload request is too large." });
  }

  const parts = await readMultipartFormData(event);
  const file = parts?.find(part => part.name === "avatar");

  if (!file?.data || !file.type) {
    throw createError({ statusCode: 400, message: "Avatar file is required." });
  }

  if (!allowedMimeTypes.has(file.type)) {
    throw createError({ statusCode: 400, message: "Unsupported avatar image type." });
  }

  if (file.data.byteLength > MAX_AVATAR_BYTES) {
    throw createError({ statusCode: 400, message: "Avatar images must be 1MB or smaller." });
  }

  const pathname = `${user.id}/avatar.${extensionByMimeType[file.type]}`;
  await blob.put(`avatars/${pathname}`, file.data, {
    contentType: file.type,
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

  await syncUserRoomSessions(event, user.id);

  return {
    avatarPath: pathname,
    avatar: avatarUrlFromPath(pathname, now),
  };
});
