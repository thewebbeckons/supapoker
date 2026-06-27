export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ready, refresh } = useCurrentUser();

  if (!ready.value) {
    await refresh();
  }

  if (!user.value) {
    return navigateTo({
      path: "/login",
      query: {
        redirectTo: to.fullPath,
      },
    });
  }
});
