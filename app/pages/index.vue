<script setup lang="ts">
const user = useSupabaseUser()

definePageMeta({
  middleware: [
    function (to, from) {
      const user = useSupabaseUser()
      if (user.value) {
        return navigateTo('/rooms')
      }
    }
  ]
})

const features = [
  {
    name: 'Real-time Estimation',
    description: 'Vote simultaneously with your team and see results instantly. No more waiting for rounds to finish.',
    icon: 'i-lucide-zap',
  },
  {
    name: 'Simple & Secure',
    description: 'Built with Supabase for enterprise-grade security. Login with ease and keep your data safe.',
    icon: 'i-lucide-shield-check',
  },
  {
    name: 'Team Friendly',
    description: 'Designed for agile teams of all sizes. Create rooms, invite members, and start planning.',
    icon: 'i-lucide-users',
  },
]
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Hero Section -->
    <div class="relative pt-24 pb-16 sm:pt-32 sm:pb-24">
      <div class="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <div class="mx-auto max-w-2xl">
          <h1 class="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-6xl">
            Agile prediction made <span class="text-primary-500">simple</span>
          </h1>
          <p class="mt-6 text-lg leading-8 text-neutral-600 dark:text-neutral-300">
            Stop wasting time with complex tools. SupaPoker is the fastest way for your team to agree on
            story points and get back to work.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <UButton to="/signup" size="xl" icon="i-lucide-rocket" color="primary">
              Get Started Free
            </UButton>
            <UButton to="/login" size="xl" variant="ghost" icon="i-lucide-log-in" color="neutral">
              Log in
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Feature Section -->
    <div class="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
      <div class="mx-auto max-w-2xl lg:max-w-none">
        <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
          <div v-for="feature in features" :key="feature.name" class="flex flex-col">
            <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-neutral-900 dark:text-white">
              <UIcon :name="feature.icon" class="h-5 w-5 flex-none text-primary-500" aria-hidden="true" />
              {{ feature.name }}
            </dt>
            <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-neutral-600 dark:text-neutral-400">
              <p class="flex-auto">{{ feature.description }}</p>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
