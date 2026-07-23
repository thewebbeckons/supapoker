<script setup lang="ts">
const { user, ready } = useCurrentUser();
const posthog = usePostHog();

watch([user, ready], ([currentUser, isReady]) => {
  if (isReady && currentUser && !currentUser.isAnonymous) {
    posthog?.identify(currentUser.id, { name: currentUser.name });
  }
}, { immediate: true });
</script>

<template>
  <UApp :toaster="{ duration: 3500 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
