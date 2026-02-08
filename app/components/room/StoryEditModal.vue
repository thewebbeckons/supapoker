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
    (e: 'success', payload: { id: string; title: string }): void
}>()

const client = useSupabaseClient<Database>()
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

    const { error } = await client
        .from('stories')
        .update({ title: titleInput.value })
        .eq('id', props.story.id)

    isUpdating.value = false

    if (error) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
        return
    }

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
