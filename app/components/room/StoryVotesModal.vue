<script lang="ts" setup>
const props = defineProps<{
    modelValue: boolean
    story: {
        id: string
        room_id: string
        title: string
    } | null
    cardValues: string[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const votes = ref<Record<string, string>>({})
const isLoading = ref(false)

watch(() => props.story, async (story) => {
    if (!story) {
        votes.value = {}
        isLoading.value = false
        return
    }
    isLoading.value = true
    try {
        votes.value = await $fetch<Record<string, string>>(`/api/rooms/${story.room_id}/stories/${story.id}/votes`)
    } catch {
        votes.value = {}
    } finally {
        isLoading.value = false
    }
})
</script>

<template>
    <UModal v-model:open="isOpen" :title="story?.title ?? 'Vote Results'"
        description="Historical vote results for this story" :ui="{ content: 'sm:max-w-2xl' }">
        <template #body>
            <div v-if="isLoading" class="flex justify-center py-8">
                <UProgress animation="carousel" />
            </div>
            <RoomVoteResults v-else :votes="votes" :cards="cardValues" />
        </template>
    </UModal>
</template>
