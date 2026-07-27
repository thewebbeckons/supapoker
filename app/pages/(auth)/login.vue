<script setup lang="ts">
import * as z from "zod";
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

const route = useRoute();
const toast = useToast();
const loading = ref(false);
const authForm = useTemplateRef<{ state: { password?: string } }>("authForm");
const hasRedirected = ref(false);
const { user, refresh } = useCurrentUser();
const posthog = usePostHog();
const { pending: githubPending, signInWithGithub } = useGithubSignIn("login");
const {
  token: turnstileToken,
  failed: turnstileFailed,
  siteKey: turnstileSiteKey,
  enabled: turnstileEnabled,
  headers: turnstileHeaders,
  waitForToken: waitForTurnstile,
  reset: resetTurnstile,
} = useAuthTurnstile();

const fields: AuthFormField[] = [{
  name: "email",
  type: "email",
  label: "Email",
  placeholder: "Enter your email",
  required: true,
  size: "lg",
}, {
  name: "password",
  label: "Password",
  type: "password",
  placeholder: "Enter your password",
  required: true,
  size: "lg",
}];

const submit = computed(() => ({ label: loading.value ? "Shuffling the deck…" : "Sign In" }));

const schema = z.object({
  email: z.string({ message: "Please provide your email" }).email("Invalid email"),
  password: z.string().min(1, "Please provide your password"),
});

type Schema = z.output<typeof schema>;

function getQueryRedirectPath(): string | null {
  const redirectTo = route.query.redirectTo;
  if (typeof redirectTo !== "string" || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return null;
  }

  if (redirectTo === "/login" || redirectTo === "/confirm") {
    return null;
  }

  return redirectTo;
}

function getPostAuthPath(): string {
  return getQueryRedirectPath() ?? "/rooms";
}

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // The widget here is invisible, so the token can still be in flight on
    // submit. Wait for it rather than sending a request the server will reject.
    if (!await waitForTurnstile()) {
      turnstileFailed.value = true;
      return;
    }

    const result = await authClient.signIn.email({
      email: payload.data.email,
      password: payload.data.password,
      callbackURL: getPostAuthPath(),
      fetchOptions: { headers: turnstileHeaders() },
    });

    if (result.error) {
      toast.add({
        title: "Error",
        description: result.error.message ?? "Unable to sign in.",
        color: "error",
      });
      return;
    }

    await refresh();
    if (user.value) {
      posthog?.identify(user.value.id, { name: user.value.name });
      posthog?.capture("user_logged_in", { method: "email" });
    }
    await navigateTo(getPostAuthPath());
  } catch (error) {
    toast.add({
      title: "Error",
      description: error instanceof Error ? error.message : "Something went wrong",
      color: "error",
    });
  } finally {
    loading.value = false;
    // Turnstile tokens are single-use, so the widget is spent either way.
    resetTurnstile();
  }
}

watch(user, async () => {
  if (user.value && !user.value.isAnonymous && !hasRedirected.value) {
    hasRedirected.value = true;
    await navigateTo(getPostAuthPath());
  }
}, { immediate: true });
</script>

<template>
  <div class="flex flex-col gap-4">
    <UAuthForm
      ref="authForm"
      title="Login"
      description="Enter your email and password to sign in."
      icon="i-lucide-user"
      :fields="fields"
      :schema="schema"
      :submit="submit"
      :loading="loading"
      @submit="onSubmit"
    >
      <template #password-hint>
        <ULink to="/forgot-password" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
      </template>

      <template #validation>
        <ClientOnly>
          <TurnstileWidget
            v-if="turnstileEnabled"
            ref="turnstileWidget"
            v-model="turnstileToken"
            :site-key="turnstileSiteKey"
            :action="AUTH_TURNSTILE_ACTION"
            appearance="interaction-only"
            @error="turnstileFailed = true"
          />
        </ClientOnly>
        <p v-if="turnstileFailed" class="text-xs text-error-400">
          The security check could not be completed. Please refresh and try again.
        </p>
      </template>
    </UAuthForm>

    <UButton
      :label="githubPending ? 'Off to GitHub…' : 'Continue with GitHub'"
      icon="i-lucide-github"
      color="neutral"
      variant="outline"
      block
      :loading="githubPending"
      @click="signInWithGithub(getPostAuthPath())"
    />

    <div class="text-center text-sm text-neutral-400">
      Don't have an account? <NuxtLink :to="{ path: '/signup', query: { redirectTo: getQueryRedirectPath() || undefined } }" class="text-primary hover:underline">Sign up</NuxtLink>
    </div>

    <!-- Required attribution: the widget above is invisible unless challenged. -->
    <p v-if="turnstileEnabled" class="text-center text-xs text-neutral-500">
      Protected by Cloudflare Turnstile —
      <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener" class="hover:underline">Privacy</a>
      and
      <a href="https://www.cloudflare.com/website-terms/" target="_blank" rel="noopener" class="hover:underline">Terms</a>
    </p>
  </div>
</template>
