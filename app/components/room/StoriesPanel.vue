<script setup lang="ts">
import type { Story } from '~/types/room'

const props = defineProps<{
    stories: Story[]
    canManage?: boolean
}>()

const emit = defineEmits<{
    (e: 'set-active', story: Story): void
    (e: 'edit', story: Story): void
    (e: 'delete', story: Story): void
    (e: 'view-votes', story: Story): void
}>()

const activeFilter = ref<'active' | 'completed' | 'all'>('active')

const activeStories = computed(() => {
    const stories = props.stories?.filter(s => ['pending', 'active', 'voting', 'voted'].includes(s.status)) || []
    return stories.sort((a, b) => {
        if (a.status === 'active') return -1
        if (b.status === 'active') return 1
        return 0
    })
})

const completedStories = computed(() => {
    return props.stories?.filter(s => s.status === 'completed') || []
})

const allStories = computed(() => {
    return props.stories || []
})

const visibleStories = computed(() => {
    if (activeFilter.value === 'active') return activeStories.value
    if (activeFilter.value === 'completed') return completedStories.value
    return allStories.value
})

const emptyMessage = computed(() => {
    if (activeFilter.value === 'active') return 'No active stories'
    if (activeFilter.value === 'completed') return 'No completed stories'
    return 'No stories yet'
})

function statusIcon(status: Story['status']) {
    if (status === 'completed') return 'i-lucide-circle-check'
    if (['active', 'voting', 'voted'].includes(status)) return 'i-lucide-play'
    return 'i-lucide-circle'
}
</script>

<template>
    <section class="stories-panel">
        <div class="stories-tabs" role="tablist" aria-label="Story filters">
            <button type="button" :class="{ active: activeFilter === 'active' }" @click="activeFilter = 'active'">
                Active stories <small>{{ activeStories.length }}</small>
            </button>
            <button type="button" :class="{ active: activeFilter === 'completed' }" @click="activeFilter = 'completed'">
                Completed <small>{{ completedStories.length }}</small>
            </button>
            <button type="button" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">
                All <small>{{ allStories.length }}</small>
            </button>
        </div>

        <div class="story-list">
            <div v-if="visibleStories.length === 0" class="empty-stories">
                <UIcon name="i-lucide-clipboard-list" />
                {{ emptyMessage }}
            </div>

            <template v-else>
                <div v-for="story in visibleStories" :key="story.id" class="story-row" :class="{ current: ['active', 'voting', 'voted'].includes(story.status) }">
                    <UIcon :name="statusIcon(story.status)" class="story-icon" />
                    <span class="story-title">{{ story.title }}</span>
                    <span class="story-status">{{ story.status }}</span>
                    <div class="story-actions">
                        <UTooltip v-if="canManage && !['active', 'voting', 'voted', 'completed'].includes(story.status)" text="Set active">
                            <UButton icon="i-lucide-play" color="neutral" variant="ghost" size="xs" aria-label="Set active" @click="emit('set-active', story)" />
                        </UTooltip>
                        <UTooltip v-if="story.status === 'completed'" text="View votes">
                            <UButton icon="i-lucide-bar-chart-2" color="neutral" variant="ghost" size="xs" aria-label="View votes" @click="emit('view-votes', story)" />
                        </UTooltip>
                        <UTooltip v-if="canManage && story.status !== 'completed'" text="Edit story">
                            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs" aria-label="Edit story" @click="emit('edit', story)" />
                        </UTooltip>
                        <UTooltip v-if="canManage" text="Delete story">
                            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" aria-label="Delete story" @click="emit('delete', story)" />
                        </UTooltip>
                    </div>
                </div>
            </template>
        </div>
    </section>
</template>

<style scoped>
.stories-panel { border-top: 1px solid rgba(255, 255, 255, 0.08); background: #0a0a0c; }
.stories-tabs { display: flex; min-height: 2.75rem; align-items: stretch; gap: 1.5rem; padding: 0 1.4rem; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
.stories-tabs button { display: flex; align-items: center; gap: 0.4rem; color: #4e4e57; border-bottom: 1px solid transparent; font-size: 0.58rem; letter-spacing: 0.11em; text-transform: uppercase; cursor: pointer; }
.stories-tabs button:hover { color: #a1a1aa; }
.stories-tabs button.active { color: #a1a1aa; border-bottom-color: #3b82f6; }
.stories-tabs small { display: grid; min-width: 1rem; height: 1rem; place-items: center; color: #62626c; border: 1px solid #24242a; font-size: 0.5rem; letter-spacing: 0; }
.story-list { min-height: 8.5rem; max-height: 13rem; overflow-y: auto; }
.story-row { display: grid; grid-template-columns: 1rem minmax(0, 1fr) auto auto; align-items: center; gap: 0.7rem; min-height: 2.65rem; padding: 0 1.4rem; color: #797983; border-bottom: 1px solid rgba(255, 255, 255, 0.045); font-size: 0.68rem; }
.story-row:last-child { border-bottom: 0; }
.story-row:hover { background: #0d0d10; }
.story-row.current { color: #d4d4d8; background: rgba(37, 99, 235, 0.05); box-shadow: inset 2px 0 #2563eb; }
.story-icon { width: 0.75rem; height: 0.75rem; color: #4b4b55; }
.current .story-icon, .current .story-status { color: #3b82f6; }
.story-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.story-status { color: #45454d; font-size: 0.55rem; letter-spacing: 0.12em; text-transform: uppercase; }
.story-actions { display: flex; min-width: 5.5rem; justify-content: flex-end; opacity: 0.38; transition: opacity 160ms ease; }
.story-row:hover .story-actions, .story-actions:focus-within { opacity: 1; }
.story-actions :deep(button) { border-radius: 0; }
.empty-stories { display: flex; min-height: 8.5rem; align-items: center; justify-content: center; gap: 0.55rem; color: #52525b; font-size: 0.68rem; }
.empty-stories :deep(svg) { width: 0.9rem; height: 0.9rem; }

@media (max-width: 560px) {
    .stories-tabs { gap: 0.75rem; padding-inline: 0.85rem; }
    .stories-tabs button { font-size: 0.48rem; }
    .story-row { grid-template-columns: 1rem minmax(0, 1fr) auto; padding-inline: 0.85rem; }
    .story-status { display: none; }
    .story-actions { min-width: 4rem; opacity: 1; }
}
</style>
