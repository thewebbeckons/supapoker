<script lang="ts" setup>
import type { Database } from '~/types/database.types'

const props = defineProps<{
    modelValue: boolean
    room: {
        id: string
        name: string
        description: string | null
        created_by: string | null
    } | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
}>()

const client = useSupabaseClient<Database>()
const toast = useToast()

const editName = ref('')
const editDescription = ref('')
const isUpdating = ref(false)

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

watch(() => props.modelValue, (val) => {
    if (val && props.room) {
        editName.value = props.room.name
        editDescription.value = props.room.description || ''
    }
})

async function updateRoom() {
    if (!editName.value.trim() || !props.room) return

    isUpdating.value = true
    const { error: updateError } = await client
        .from('rooms')
        .update({
            name: editName.value,
            description: editDescription.value,
            updated_at: new Date().toISOString()
        })
        .eq('id', props.room.id)

    isUpdating.value = false

    if (updateError) {
        toast.add({ title: 'Error', description: updateError.message, color: 'error' })
        return
    }

    toast.add({ title: 'Success', description: 'Room updated successfully', color: 'success' })
    emit('success')
    isOpen.value = false
}
</script>

<template>
    <UModal v-model:open="isOpen" title="Edit Room" description="Update room details." :ui="{ content: 'sm:max-w-xl' }">
        <template #body>
            <div class="flex flex-col gap-4">
                <UFormField label="Room Name" required>
                    <UInput v-model="editName" placeholder="Room name" @keydown.enter="updateRoom" class="w-full"
                        autofocus />
                </UFormField>

                <UFormField label="Description">
                    <UTextarea v-model="editDescription" placeholder="Description..." :rows="3" class="w-full" />
                </UFormField>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton label="Save Changes" color="primary" @click="updateRoom" :disabled="!editName.trim()"
                        :loading="isUpdating" />
                </div>
            </div>
        </template>
    </UModal>
</template>
