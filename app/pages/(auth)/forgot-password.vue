<script setup lang="ts">
import * as z from "zod";
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

const toast = useToast();
const appOrigin = useRequestURL().origin;
const authForm = useTemplateRef("authForm");

const fields: AuthFormField[] = [{
  name: "email",
  type: "email",
  label: "Email",
  placeholder: "Enter your email",
  required: true,
  size: "lg",
}];

const schema = z.object({
  email: z.email("Invalid email"),
});

type Schema = z.output<typeof schema>;

const loading = ref(false);

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    const resetUrl = new URL("/reset-password", appOrigin);
    const result = await authClient.requestPasswordReset({
      email: payload.data.email,
      redirectTo: resetUrl.toString(),
    });

    if (result.error) {
      toast.add({
        title: "Error",
        description: result.error.message ?? "Unable to send reset instructions.",
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Success",
      description: "Password reset instructions have been sent to your email.",
      color: "success",
      duration: 3000,
    });
    if (authForm.value) {
      (authForm.value as any).state.email = "";
    }
    setTimeout(() => {
      navigateTo("/login");
    }, 3000);
  } catch (error) {
    toast.add({
      title: "Error",
      description: error instanceof Error ? error.message : "Unable to send reset instructions.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UAuthForm
      ref="authForm"
      title="Forgot Password"
      description="Enter your email to receive password reset instructions."
      icon="i-lucide-lock"
      :fields="fields"
      :schema="schema"
      :loading="loading"
      @submit="onSubmit"
    />
    <div class="text-center text-sm text-neutral-400">
      Remember your password? <NuxtLink to="/login" class="text-primary hover:underline">Log in</NuxtLink>
    </div>
  </div>
</template>
