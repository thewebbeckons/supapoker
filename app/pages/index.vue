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

const links = [
  {
    label: 'Get Started Free',
    to: '/signup',
    size: 'xl' as const,
    icon: 'i-lucide-rocket',
    color: 'primary' as const
  },
  {
    label: 'Log in',
    to: '/login',
    size: 'xl' as const,
    variant: 'ghost' as const,
    icon: 'i-lucide-log-in',
    color: 'neutral' as const
  }
]

const features = [
  {
    title: 'Real-time Estimation',
    description: 'Vote simultaneously with your team and see results instantly. No more waiting for rounds to finish.',
    icon: 'i-lucide-zap',
  },
  {
    title: 'Simple & Secure',
    description: 'Built with Supabase for enterprise-grade security. Login with ease and keep your data safe.',
    icon: 'i-lucide-shield-check',
  },
  {
    title: 'Team Friendly',
    description: 'Designed for agile teams of all sizes. Create rooms, invite members, and start planning.',
    icon: 'i-lucide-users',
  },
]
</script>

<template>
  <div>
    <UPageHero
      description="Stop wasting time with complex tools. SupaPoker is the fastest way for your team to agree on story points and get back to work."
      :links="links">
      <template #title>
        Agile prediction made <span class="text-primary-500">simple</span>
      </template>
    </UPageHero>

    <UPageSection>
      <UPageGrid>
        <UPageFeature v-for="feature in features" :key="feature.title" v-bind="feature" />
      </UPageGrid>
    </UPageSection>
  </div>
</template>
