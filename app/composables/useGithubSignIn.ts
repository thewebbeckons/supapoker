export function useGithubSignIn(page: "login" | "signup") {
  const toast = useToast();
  const posthog = usePostHog();
  const pending = ref(false);

  async function signInWithGithub(callbackURL: string) {
    if (pending.value) return;
    pending.value = true;
    posthog?.capture("github_login_initiated", { page });

    try {
      const result = await authClient.signIn.social({ provider: "github", callbackURL });
      if (result.error) throw new Error(result.error.message ?? "Unable to reach GitHub.");
      // Success is a full-page redirect, so leave `pending` set — the button keeps
      // spinning until the browser actually leaves.
    } catch (error) {
      pending.value = false;
      toast.add({
        title: "Error",
        description: error instanceof Error ? error.message : "Unable to reach GitHub.",
        color: "error",
      });
    }
  }

  return { pending, signInWithGithub };
}
