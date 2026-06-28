export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: boolean;
}

export function useCurrentUser() {
  const user = useState<CurrentUser | null>("current-user", () => null);
  const ready = useState("current-user-ready", () => false);
  const fetchSession = import.meta.server ? useRequestFetch() : $fetch;

  const loggedIn = computed(() => Boolean(user.value));

  async function refresh() {
    try {
      const session = await fetchSession<{ user: CurrentUser | null }>("/api/session");
      user.value = session.user;
    } catch {
      user.value = null;
    } finally {
      ready.value = true;
    }
  }

  async function signOut() {
    await authClient.signOut();
    user.value = null;
    ready.value = true;
  }

  if (import.meta.client && !ready.value) {
    void refresh();
  }

  return {
    user,
    ready,
    loggedIn,
    refresh,
    signOut,
  };
}
