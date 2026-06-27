<script lang="ts" setup>
const props = defineProps<{
    modelValue: boolean
    story: {
        id: string
        room_id: string
        title: string
    } | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'success', payload: { id: string; title: string }): void
}>()

const toast = useToast()

const titleInput = ref('')
const isUpdating = ref(false)

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

watch(() => props.story, (val) => {
    if (val) {
        titleInput.value = val.title
    }
})

async function updateStory() {
    if (!titleInput.value.trim() || !props.story) return

    isUpdating.value = true

    try {
        await $fetch(`/api/rooms/${props.story.room_id}/stories/${props.story.id}`, {
            method: 'PATCH',
            body: { title: titleInput.value },
        })
    } catch (error: any) {
        toast.add({ title: 'Error', description: error?.data?.message ?? error.message, color: 'error' })
        isUpdating.value = false
        return
    }

    isUpdating.value = false
    emit('success', { id: props.story!.id, title: titleInput.value })
    isOpen.value = false
    toast.add({ title: 'Success', description: 'Story updated.', color: 'success' })
}
</script>

<template>
    <UModal v-model:open="isOpen" title="Edit Story" description="Update the story title."
        :ui="{ content: 'sm:max-w-md' }">
        <template #body>
            <div class="flex flex-col gap-4">
                <UFormField label="Story Title" required>
                    <UInput v-model="titleInput" placeholder="Enter story title..." autofocus class="w-full"
                        @keydown.enter="updateStory" />
                </UFormField>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton label="Save Changes" color="primary" @click="updateStory" :disabled="!titleInput.trim()"
                        :loading="isUpdating" />
                </div>
            </div>
        </template>
    </UModal>
</template>
