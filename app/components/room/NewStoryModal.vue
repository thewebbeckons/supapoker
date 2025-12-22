<script lang="ts" setup>
import type { Database } from '~/types/database.types'

const props = defineProps<{
    modelValue: boolean
    room: {
        id: string
        name: string
        created_by: string | null
    } | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
}>()

const client = useSupabaseClient<Database>()
const toast = useToast()

const storyName = ref('')
const isUpdating = ref(false)

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

watch(() => props.modelValue, (val) => {
    if (val) {
        storyName.value = ''
    }
})

async function createStory() {
    if (!storyName.value.trim() || !props.room) return

    isUpdating.value = true
    const { error: updateError } = await client
        .from('rooms')
        .update({
            current_story_card: storyName.value,
            updated_at: new Date().toISOString()
        })
        .eq('id', props.room.id)

    isUpdating.value = false

    if (updateError) {
        toast.add({ title: 'Error', description: updateError.message, color: 'error' })
        return
    }

    emit('success')
    isOpen.value = false
}
</script>

<template>
    <UModal v-model:open="isOpen" title="New Story" description="Set the active story for this room."
        :ui="{ content: 'sm:max-w-xl' }">
        <template #body>
            <div class="flex flex-col gap-4">
                <UFormField label="Story Name" required>
                    <UInput v-model="storyName" placeholder="e.g. USER-123 Login Page" @keydown.enter="createStory"
                        class="w-full" autofocus />
                </UFormField>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton label="Set Active" color="primary" @click="createStory" :disabled="!storyName.trim()"
                        :loading="isUpdating" />
                </div>
            </div>
        </template>
    </UModal>
</template>
