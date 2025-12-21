<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const route = useRoute()

onMounted(() => {
  // Listen for auth state changes to detect recovery flow
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      navigateTo('/reset-password')
    } else if (event === 'SIGNED_IN') {
      // If we are signed in, check if it looks like a recovery flow from the URL
      // explicit check to avoid race condition where SIGNED_IN fires before PASSWORD_RECOVERY
      const isRecovery = route.query.type === 'recovery' || route.hash.includes('type=recovery')

      if (!isRecovery) {
        navigateTo('/rooms')
      } else {
        navigateTo('/reset-password')
      }
    }
  })
})

// Fallback watch: if user is already present (hydration) and no event fires immediately
watch(user, () => {
  if (user.value) {
    const isRecovery = route.query.type === 'recovery' || route.hash.includes('type=recovery')
    if (isRecovery) {
      navigateTo('/reset-password')
    } else {
      // We rely on onMounted for the redirect to allow events to process.
      // But if we've been sitting here for a bit (e.g. 500ms) and nothing happened, we might move on?
      // For now, let's assume onAuthStateChange is triggering.
    }
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