import { imageMeta } from "image-meta";

export const AVATAR_DIMENSION = 200;
export const MAX_PROCESSED_AVATAR_BYTES = 100 * 1024;
export const MAX_AVATAR_REQUEST_BYTES = MAX_PROCESSED_AVATAR_BYTES + 64 * 1024;

interface AvatarMetadata {
  type?: string;
  width?: number;
  height?: number;
}

export function validateProcessedAvatarMetadata(
  contentType: string,
  byteLength: number,
  metadata: AvatarMetadata,
): string | null {
  if (contentType !== "image/webp" || metadata.type !== "webp") {
    return "Avatar uploads must be WebP images.";
  }

  if (byteLength > MAX_PROCESSED_AVATAR_BYTES) {
    return "Processed avatar images must be 100KB or smaller.";
  }

  if (metadata.width !== AVATAR_DIMENSION || metadata.height !== AVATAR_DIMENSION) {
    return `Processed avatar images must be exactly ${AVATAR_DIMENSION}x${AVATAR_DIMENSION} pixels.`;
  }

  return null;
}

export function validateProcessedAvatar(data: Uint8Array, contentType: string): string | null {
  if (contentType !== "image/webp") {
    return "Avatar uploads must be WebP images.";
  }

  if (data.byteLength > MAX_PROCESSED_AVATAR_BYTES) {
    return "Processed avatar images must be 100KB or smaller.";
  }

  let metadata: AvatarMetadata;
  try {
    metadata = imageMeta(data);
  } catch {
    return "Avatar file is not a valid image.";
  }

  return validateProcessedAvatarMetadata(contentType, data.byteLength, metadata);
}
