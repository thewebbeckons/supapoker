<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const user = useSupabaseUser()

watch(user, () => {
  if (user.value) {
    navigateTo('/rooms')
  }
}, { immediate: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="flex flex-col items-center gap-4">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      <p class="text-neutral-500">Verifying...</p>
    </div>
  </div>
</template>