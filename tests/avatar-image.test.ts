import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCenteredSquareCrop,
  MAX_AVATAR_SOURCE_BYTES,
} from "../app/utils/avatar-image.ts";
import {
  MAX_PROCESSED_AVATAR_BYTES,
  validateProcessedAvatar,
  validateProcessedAvatarMetadata,
} from "../server/utils/avatar.ts";

test("centered avatar crops preserve the largest square", () => {
  assert.deepEqual(calculateCenteredSquareCrop(400, 200), {
    x: 100,
    y: 0,
    width: 200,
    height: 200,
  });

  assert.deepEqual(calculateCenteredSquareCrop(200, 400), {
    x: 0,
    y: 100,
    width: 200,
    height: 200,
  });

  assert.deepEqual(calculateCenteredSquareCrop(300, 300), {
    x: 0,
    y: 0,
    width: 300,
    height: 300,
  });
});

test("invalid source dimensions are rejected", () => {
  assert.throws(() => calculateCenteredSquareCrop(0, 200), /dimensions/);
  assert.throws(() => calculateCenteredSquareCrop(200, Number.NaN), /dimensions/);
  assert.equal(MAX_AVATAR_SOURCE_BYTES, 10 * 1024 * 1024);
});

test("the server accepts only small 200x200 WebP metadata", () => {
  assert.equal(validateProcessedAvatarMetadata("image/webp", 50_000, {
    type: "webp",
    width: 200,
    height: 200,
  }), null);

  assert.match(validateProcessedAvatarMetadata("image/png", 50_000, {
    type: "png",
    width: 200,
    height: 200,
  }) ?? "", /WebP/);

  assert.match(validateProcessedAvatarMetadata("image/webp", MAX_PROCESSED_AVATAR_BYTES + 1, {
    type: "webp",
    width: 200,
    height: 200,
  }) ?? "", /100KB/);

  assert.match(validateProcessedAvatarMetadata("image/webp", 50_000, {
    type: "webp",
    width: 201,
    height: 200,
  }) ?? "", /200x200/);
});

test("invalid image bytes are rejected before storage", () => {
  assert.match(
    validateProcessedAvatar(new TextEncoder().encode("not an image"), "image/webp") ?? "",
    /valid image/,
  );
});
