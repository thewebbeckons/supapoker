export const AVATAR_DIMENSION = 200;
export const MAX_AVATAR_SOURCE_BYTES = 10 * 1024 * 1024;
export const TARGET_AVATAR_BYTES = 50 * 1024;
export const MAX_PROCESSED_AVATAR_BYTES = 100 * 1024;

const WEBP_QUALITIES = [0.82, 0.74, 0.66, 0.58, 0.5] as const;

export interface SquareCrop {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function calculateCenteredSquareCrop(width: number, height: number): SquareCrop {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Unable to read the image dimensions.");
  }

  const size = Math.min(width, height);
  return {
    x: (width - size) / 2,
    y: (height - size) / 2,
    width: size,
    height: size,
  };
}

function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== "image/webp") {
        reject(new Error("This browser cannot prepare WebP avatar images."));
        return;
      }

      resolve(blob);
    }, "image/webp", quality);
  });
}

export async function processAvatarImage(file: File): Promise<Blob> {
  if (file.size > MAX_AVATAR_SOURCE_BYTES) {
    throw new Error("Avatar source images must be 10MB or smaller.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("The selected file could not be decoded as an image.");
  }

  try {
    const crop = calculateCenteredSquareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_DIMENSION;
    canvas.height = AVATAR_DIMENSION;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("This browser cannot resize avatar images.");
    }

    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      AVATAR_DIMENSION,
      AVATAR_DIMENSION,
    );

    let result: Blob | null = null;
    for (const quality of WEBP_QUALITIES) {
      result = await encodeWebp(canvas, quality);
      if (result.size <= TARGET_AVATAR_BYTES) return result;
    }

    if (!result || result.size > MAX_PROCESSED_AVATAR_BYTES) {
      throw new Error("The resized avatar is still too large to upload.");
    }

    return result;
  } finally {
    bitmap.close();
  }
}
