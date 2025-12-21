<script lang="ts" setup>
import type { Database } from '~/types/database.types'

const props = defineProps<{
    modelValue: boolean
    room: {
        id: string
        name: string
    } | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

const client = useSupabaseClient<Database>()
const toast = useToast()
const router = useRouter()
const isDeleting = ref(false)

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

async function executeDelete() {
    if (!props.room) return
    isDeleting.value = true

    const { error } = await client
        .from('rooms')
        .delete()
        .eq('id', props.room.id)

    if (error) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
        isDeleting.value = false
        return
    }

    toast.add({ title: 'Success', description: 'Room deleted.', color: 'success' })
    isOpen.value = false
    navigateTo('/rooms')
}
</script>

<template>
    <UModal v-model:open="isOpen" title="Delete Room" description="Are you sure you want to delete this room?"
        :ui="{ content: 'sm:max-w-md' }">
        <template #body>
            <div class="flex flex-col gap-4">
                <div
                    class="p-4 bg-error-50 dark:bg-error-950/50 rounded-lg border border-error-200 dark:border-error-900">
                    <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-error-500 mt-0.5" />
                        <div>
                            <h3 class="text-sm font-medium text-error-800 dark:text-error-200">Warning</h3>
                            <p class="text-sm text-error-600 dark:text-error-300 mt-1">
                                You are about to delete <strong>{{ room?.name }}</strong>. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton label="Delete Room" color="error" @click="executeDelete" :loading="isDeleting" />
                </div>
            </div>
        </template>
    </UModal>
</template>
