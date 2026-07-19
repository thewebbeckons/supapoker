export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: boolean;
  isAnonymous: boolean;
}

export function useCurrentUser() {
  const user = useState<CurrentUser | null>("current-user", () => null);
  const ready = useState("current-user-ready", () => false);
  const guestRoomId = useState<string | null>("current-user-guest-room", () => null);
  const fetchSession = import.meta.server ? useRequestFetch() : $fetch;

  const loggedIn = computed(() => Boolean(user.value));
  const isRegistered = computed(() => Boolean(user.value && !user.value.isAnonymous));

  async function refresh() {
    try {
      const session = await fetchSession<{ user: CurrentUser | null; guestRoomId: string | null }>("/api/session");
      user.value = session.user;
      guestRoomId.value = session.guestRoomId;
    } catch {
      user.value = null;
      guestRoomId.value = null;
    } finally {
      ready.value = true;
    }
  }

  async function signOut() {
    await authClient.signOut();
    user.value = null;
    guestRoomId.value = null;
    ready.value = true;
  }

  if (import.meta.client && !ready.value) {
    void refresh();
  }

  return {
    user,
    ready,
    loggedIn,
    isRegistered,
    guestRoomId,
    refresh,
    signOut,
  };
}
