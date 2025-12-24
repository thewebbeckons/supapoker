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

const storiesInput = ref('')
const isUpdating = ref(false)

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

watch(() => props.modelValue, (val) => {
    if (val) {
        storiesInput.value = ''
    }
})

async function createStories() {
    if (!storiesInput.value.trim() || !props.room) return

    isUpdating.value = true

    // Split by newline and filter empty lines
    const titles = storiesInput.value
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0)

    if (titles.length === 0) {
        isUpdating.value = false
        return
    }

    const { error: insertError } = await client
        .from('stories')
        .insert(
            titles.map(title => ({
                room_id: props.room!.id,
                title,
                status: 'pending' // Default status
            }))
        )

    isUpdating.value = false

    if (insertError) {
        toast.add({ title: 'Error', description: insertError.message, color: 'error' })
        return
    }

    emit('success')
    isOpen.value = false
    toast.add({ title: 'Success', description: `Created ${titles.length} stor${titles.length === 1 ? 'y' : 'ies'}`, color: 'success' })
}
</script>

<template>
    <UModal v-model:open="isOpen" title="New Story" description="Add stories to this room. Enter one story per line."
        :ui="{ content: 'sm:max-w-xl' }">
        <template #body>
            <div class="flex flex-col gap-4">
                <UFormField label="Stories" required>
                    <UTextarea v-model="storiesInput" placeholder="USER-123 Login Page&#10;USER-124 Signup Page"
                        :rows="5" class="w-full" autofocus />
                </UFormField>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton label="Create" color="primary" @click="createStories" :disabled="!storiesInput.trim()"
                        :loading="isUpdating" />
                </div>
            </div>
        </template>
    </UModal>
</template>
