export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);
  return {
    user: session?.user ?? null,
  };
});
