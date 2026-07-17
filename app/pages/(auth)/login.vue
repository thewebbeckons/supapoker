<script setup lang="ts">
import * as z from "zod";
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

const route = useRoute();
const config = useRuntimeConfig();
const toast = useToast();
const loading = ref(false);
const authForm = useTemplateRef<{ state: { password?: string } }>("authForm");
const hasRedirected = ref(false);
const { user, refresh } = useCurrentUser();
const githubAuthEnabled = computed(() => String(config.public.githubAuthEnabled) !== "false");

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

const submit = computed(() => ({
  label: "Sign In",
}));

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
    const result = await authClient.signIn.email({
      email: payload.data.email,
      password: payload.data.password,
      callbackURL: getPostAuthPath(),
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
    await navigateTo(getPostAuthPath());
  } catch (error) {
    toast.add({
      title: "Error",
      description: error instanceof Error ? error.message : "Something went wrong",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function signInWithGithub() {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: getPostAuthPath(),
  });
}

watch(user, async () => {
  if (user.value && !hasRedirected.value) {
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
    </UAuthForm>

    <UButton
      v-if="githubAuthEnabled"
      label="Continue with GitHub"
      icon="i-lucide-github"
      color="neutral"
      variant="outline"
      block
      @click="signInWithGithub"
    />

    <div class="text-center text-sm text-neutral-400">
      Don't have an account? <NuxtLink to="/signup" class="text-primary hover:underline">Sign up</NuxtLink>
    </div>
  </div>
</template>
