<script lang="ts" setup>
import type { Database } from '~/types/database.types'

const props = defineProps<{
    modelValue: boolean
    story: {
        id: string
        title: string
    } | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

const client = useSupabaseClient<Database>()

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const votes = ref<Record<string, string>>({})
const isLoading = ref(false)

watch(() => props.story, async (story) => {
    if (!story) return
    isLoading.value = true
    const { data } = await client
        .from('story_votes')
        .select('user_id, vote_value')
        .eq('story_id', story.id)

    const voteMap: Record<string, string> = {}
    if (data) {
        for (const row of data) {
            voteMap[row.user_id] = row.vote_value
        }
    }
    votes.value = voteMap
    isLoading.value = false
})
</script>

<template>
    <UModal v-model:open="isOpen" :title="story?.title ?? 'Vote Results'"
        description="Historical vote results for this story" :ui="{ content: 'sm:max-w-2xl' }">
        <template #body>
            <div v-if="isLoading" class="flex justify-center py-8">
                <UProgress animation="carousel" />
            </div>
            <RoomVoteResults v-else :votes="votes" />
        </template>
    </UModal>
</template>
