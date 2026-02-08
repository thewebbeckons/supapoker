<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const user = useSupabaseUser()
const route = useRoute()
const redirectInfo = useSupabaseCookieRedirect()
const hasRedirected = ref(false)

function getQueryRedirectPath(): string | null {
  const redirectTo = route.query.redirectTo
  if (typeof redirectTo !== 'string' || !redirectTo.startsWith('/')) {
    return null
  }

  if (redirectTo === '/login' || redirectTo === '/confirm') {
    return null
  }

  return redirectTo
}

function getPostAuthPath(): string {
  const queryPath = getQueryRedirectPath()
  if (queryPath) return queryPath

  const cookiePath = redirectInfo.pluck()
  if (
    typeof cookiePath === 'string' &&
    cookiePath.startsWith('/') &&
    cookiePath !== '/login' &&
    cookiePath !== '/confirm'
  ) {
    return cookiePath
  }

  return '/rooms'
}

watch(user, async () => {
  if (user.value && !hasRedirected.value) {
    hasRedirected.value = true
    await navigateTo(getPostAuthPath())
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
