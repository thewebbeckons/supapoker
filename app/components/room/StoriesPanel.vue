<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { TabsItem } from '@nuxt/ui'

type Story = Database['public']['Tables']['stories']['Row']

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

const items = [{
    label: 'Active Stories',
    slot: 'active' as const
}, {
    label: 'Completed Stories',
    slot: 'completed' as const
}, {
    label: 'All Stories',
    slot: 'all' as const
}] satisfies TabsItem[]

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

const activeCount = computed(() => activeStories.value.length)
const completedCount = computed(() => completedStories.value.length)
const allCount = computed(() => allStories.value.length)
</script>

<template>
    <div class="flex flex-col bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <UTabs :items="items" variant="pill" :ui="{ trigger: 'grow' }" class="w-full">
            <template #active="{ item }">
                <div class="p-0 overflow-y-auto max-h-60 min-h-[200px]">
                    <div v-if="activeStories.length === 0"
                        class="flex flex-col items-center justify-center h-48 text-neutral-400">
                        <UIcon name="i-lucide-clipboard-list" class="w-8 h-8 mb-2" />
                        <span class="text-sm">No active stories</span>
                    </div>
                    <div v-else>
                        <div v-for="story in activeStories" :key="story.id"
                            class="group flex items-center px-6 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                            :class="story.status === 'active' ? 'bg-primary-50/50 dark:bg-primary-900/10 border-l-4 border-l-primary-500' : ''">
                            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ story.title
                            }}</span>
                            <div class="ml-auto flex items-center gap-1">
                                <span v-if="['active', 'voting', 'voted'].includes(story.status)"
                                    class="text-xs uppercase font-bold px-2 py-0.5 rounded" :class="{
                                        'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300': story.status === 'active',
                                        'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300': story.status === 'voting',
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': story.status === 'voted'
                                    }">
                                    {{ story.status }}
                                </span>
                                <template v-if="canManage">
                                    <UTooltip v-if="story.status !== 'active'" text="Set Active">
                                        <UButton icon="i-lucide-play" color="neutral" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('set-active', story)" />
                                    </UTooltip>
                                    <UTooltip text="Edit Story">
                                        <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('edit', story)" />
                                    </UTooltip>
                                    <UTooltip text="Delete Story">
                                        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('delete', story)" />
                                    </UTooltip>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <template #completed="{ item }">
                <div class="p-0 overflow-y-auto max-h-60 min-h-[200px]">
                    <div v-if="completedStories.length === 0"
                        class="flex flex-col items-center justify-center h-48 text-neutral-400">
                        <UIcon name="i-lucide-check-circle" class="w-8 h-8 mb-2" />
                        <span class="text-sm">No completed stories</span>
                    </div>
                    <div v-else>
                        <div v-for="story in completedStories" :key="story.id"
                            class="group flex items-center px-6 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ story.title
                            }}</span>
                            <div class="ml-auto flex items-center gap-1">
                                <span
                                    class="text-xs uppercase font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    {{ story.status }}
                                </span>
                                <UTooltip text="View Votes">
                                    <UButton icon="i-lucide-bar-chart-2" color="neutral" variant="ghost" size="xs"
                                        class="opacity-0 group-hover:opacity-100 transition-opacity"
                                        @click="emit('view-votes', story)" />
                                </UTooltip>
                                <template v-if="canManage">
                                    <UTooltip text="Delete Story">
                                        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('delete', story)" />
                                    </UTooltip>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <template #all="{ item }">
                <div class="p-0 overflow-y-auto max-h-60 min-h-[200px]">
                    <div v-if="allStories.length === 0"
                        class="flex flex-col items-center justify-center h-48 text-neutral-400">
                        <UIcon name="i-lucide-layers" class="w-8 h-8 mb-2" />
                        <span class="text-sm">No stories yet</span>
                    </div>
                    <div v-else>
                        <div v-for="story in allStories" :key="story.id"
                            class="group flex items-center px-6 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                            :class="story.status === 'active' ? 'bg-primary-50/50 dark:bg-primary-900/10 border-l-4 border-l-primary-500' : ''">
                            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ story.title
                            }}</span>
                            <div class="ml-auto flex items-center gap-1">
                                <span v-if="story.status !== 'pending'"
                                    class="text-xs uppercase font-bold px-2 py-0.5 rounded"
                                    :class="story.status === 'active' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'">
                                    {{ story.status }}
                                </span>
                                <template v-if="story.status === 'completed'">
                                    <UTooltip text="View Votes">
                                        <UButton icon="i-lucide-bar-chart-2" color="neutral" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('view-votes', story)" />
                                    </UTooltip>
                                    <UTooltip v-if="canManage" text="Delete Story">
                                        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('delete', story)" />
                                    </UTooltip>
                                </template>
                                <template v-else-if="canManage">
                                    <UTooltip v-if="story.status !== 'active'" text="Set Active">
                                        <UButton icon="i-lucide-play" color="neutral" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('set-active', story)" />
                                    </UTooltip>
                                    <UTooltip text="Edit Story">
                                        <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('edit', story)" />
                                    </UTooltip>
                                    <UTooltip text="Delete Story">
                                        <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            @click="emit('delete', story)" />
                                    </UTooltip>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </UTabs>
    </div>
</template>
