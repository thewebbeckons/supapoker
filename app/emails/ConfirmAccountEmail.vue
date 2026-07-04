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
    title="Confirm your account"
    preview="Confirm your email to create rooms, invite your team, and start estimating in SupaPoker."
    action-label="Confirm email"
    :action-url="actionUrl"
    :app-url="appUrl"
    :user-email="email"
    note="After confirmation, you can create a planning room and share it with your team."
  >
    <EmailText>
      Thanks for joining SupaPoker. Confirm your email to unlock planning rooms, invite teammates,
      and estimate stories together.
    </EmailText>
    <EmailText tone="muted">
      SupaPoker keeps votes hidden until reveal time so the first estimate does not steer the room.
    </EmailText>
  </EmailLayout>
</template>
