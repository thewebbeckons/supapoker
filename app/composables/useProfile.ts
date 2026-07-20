export interface UserProfile {
  userId: string;
  user_id: string;
  name: string;
  email: string;
  avatar: string | null;
  avatarPath: string | null;
}

export function useProfile() {
  const { user } = useCurrentUser();
  const profileKey = computed(() => `current-user-profile:${user.value?.id ?? "anonymous"}`);
  const fetchProfile = import.meta.server ? useRequestFetch() : $fetch;

  return useAsyncData(profileKey, async () => {
    if (!user.value || user.value.isAnonymous) return null;

    return await fetchProfile<UserProfile>("/api/profile");
  }, {
    default: () => null,
  });
}
