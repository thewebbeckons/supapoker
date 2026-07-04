<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

const toast = useToast();
const submittedEmail = ref("");

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email"),
  password: passwordSchema,
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  name: "",
  email: "",
  password: "",
});

const { passwordStrength, strengthScore, strengthColor } = usePasswordStrength(toRef(state, "password"));

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  submittedEmail.value = "";

  const result = await authClient.signUp.email({
    email: payload.data.email,
    password: payload.data.password,
    name: payload.data.name,
    callbackURL: "/rooms",
  });

  if (result.error) {
    toast.add({
      title: "Error",
      description: result.error.message ?? "Unable to create account.",
      color: "error",
    });
    return;
  }

  submittedEmail.value = payload.data.email;
  state.password = "";

  toast.add({
    title: "Check your email",
    description: "We sent you a confirmation link to finish creating your account.",
    color: "success",
  });
}

async function signInWithGithub() {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: "/rooms",
  });
}

onUnmounted(() => {
  state.name = "";
  state.email = "";
  state.password = "";
  submittedEmail.value = "";
});
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <div v-if="submittedEmail" class="flex flex-col items-center gap-5 text-center">
      <div class="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary dark:bg-primary-950/50">
        <UIcon name="i-lucide-mail-check" class="size-7" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-bold">Please confirm your email</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          We sent a confirmation link to <span class="font-medium text-neutral-900 dark:text-white">{{ submittedEmail }}</span>.
          Open that link to activate your account, then sign in.
        </p>
      </div>

      <div class="flex w-full flex-col gap-2">
        <UButton label="Go to Login" icon="i-lucide-log-in" color="primary" block to="/login" />
        <UButton label="Use a Different Email" icon="i-lucide-pencil" color="neutral" variant="ghost" block @click="submittedEmail = ''" />
      </div>
    </div>

    <template v-else>
      <div class="flex flex-col gap-2 mb-4 text-center">
        <h1 class="text-2xl font-bold">Sign Up</h1>
        <p class="text-neutral-400">Create a new account to get started.</p>
      </div>

      <UForm :schema="schema" :state="state" class="flex flex-col gap-4" @submit="onSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" size="lg" placeholder="Enter your name" icon="i-lucide-user" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" size="lg" type="email" placeholder="Enter your email" icon="i-lucide-mail" class="w-full" />
        </UFormField>

        <UFormField label="Password" name="password" required>
          <UInput v-model="state.password" size="lg" type="password" placeholder="Enter your password" icon="i-lucide-lock" class="w-full" />

          <div class="mt-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 space-y-3">
            <p class="text-sm font-medium text-neutral-900 dark:text-white">Password Strength</p>
            <UProgress :model-value="strengthScore" :max="5" :color="strengthColor" size="xs" />
            <div class="grid grid-cols-2 gap-1 text-xs">
              <div v-for="(req, index) in passwordStrength" :key="index" class="flex items-center gap-1" :class="req.met ? 'text-green-500' : 'text-neutral-500'">
                <UIcon :name="req.met ? 'i-lucide-check' : 'i-lucide-circle'" class="w-3 h-3" />
                <span>{{ req.label }}</span>
              </div>
            </div>
          </div>
        </UFormField>

        <UButton type="submit" block label="Sign Up" color="primary" />
      </UForm>

      <UButton label="Continue with GitHub" icon="i-lucide-github" color="neutral" variant="outline" block @click="signInWithGithub" />

      <div class="text-center text-sm text-neutral-400">
        Already have an account? <NuxtLink to="/login" class="text-primary hover:underline">Login</NuxtLink>
      </div>
    </template>
  </div>
</template>
