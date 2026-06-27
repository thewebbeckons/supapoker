import { blob } from "hub:blob";

export default defineEventHandler(async (event) => {
  const pathname = getRouterParam(event, "pathname");
  if (!pathname) {
    throw createError({ statusCode: 404, message: "Avatar not found." });
  }

  return blob.serve(event, `avatars/${pathname}`);
});
