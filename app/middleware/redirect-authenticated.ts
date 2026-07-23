export default defineNuxtRouteMiddleware(async () => {
  const { user, ready, refresh } = useCurrentUser();

  if (!ready.value) await refresh();

  if (user.value && !user.value.isAnonymous) {
    return navigateTo("/rooms");
  }
});
