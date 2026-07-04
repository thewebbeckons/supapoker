<script setup lang="ts">
import EmailLayout from "./components/EmailLayout.vue";
import EmailText from "./components/EmailText.vue";

defineProps<{
  email: string;
  actionUrl: string;
  appUrl: string;
}>();
</script>

<template>
  <EmailLayout
    title="Reset your password"
    preview="Use this secure link to reset your SupaPoker password."
    action-label="Reset password"
    :action-url="actionUrl"
    :app-url="appUrl"
    :user-email="email"
    note="This link is time-sensitive. If you did not request a password reset, you can ignore this email."
  >
    <EmailText>
      We received a request to reset your SupaPoker password. Use the secure button below to set a
      new one.
    </EmailText>
    <EmailText tone="muted">
      Your active rooms and profile will stay as they are after the password is changed.
    </EmailText>
  </EmailLayout>
</template>
