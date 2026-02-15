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
    title: 'Live Vote Sync',
    description: 'Watch votes appear in real-time as your team submits them. No refresh needed, instant updates.',
    icon: 'i-lucide-zap',
  },
  {
    title: 'Blind Voting',
    description: 'Votes stay hidden until you reveal them. Keep estimations unbiased and focused on the work.',
    icon: 'i-lucide-eye-off',
  },
  {
    title: 'Story Workflow',
    description: 'Track stories from backlog to completed. Manage your entire estimation process in one place.',
    icon: 'i-lucide-kanban',
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
      <div class="flex justify-center">
        <ClientOnly>
          <UiSafariMockup
            url="supapoker.com/rooms/abc123"
            src="/mockup.png"
            class="size-full"
          />
        </ClientOnly>
      </div>
    </UPageSection>

    <UPageSection>
      <UPageGrid>
        <UPageFeature v-for="feature in features" :key="feature.title" v-bind="feature" />
      </UPageGrid>
    </UPageSection>

    <UPageSection class="text-center border-3 border-blue-600">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
          Ready to plan better?
        </h2>
        <p class="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
          Create a room in seconds and start estimating with your team. No credit card required.
        </p>
        <div class="flex justify-center gap-4">
          <UButton
            to="/signup"
            size="xl"
            color="primary"
            icon="i-lucide-rocket"
          >
            Get Started Free
          </UButton>
        </div>
      </div>
    </UPageSection>
  </div>
</template>
