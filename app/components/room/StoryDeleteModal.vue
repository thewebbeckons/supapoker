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
    (e: 'success'): void
}>()

const client = useSupabaseClient<Database>()
const toast = useToast()
const isDeleting = ref(false)

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

async function deleteStory() {
    if (!props.story) return
    isDeleting.value = true

    const { error } = await client
        .from('stories')
        .delete()
        .eq('id', props.story.id)

    isDeleting.value = false

    if (error) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
        return
    }

    emit('success')
    isOpen.value = false
    toast.add({ title: 'Success', description: 'Story deleted.', color: 'success' })
}
</script>

<template>
    <UModal v-model:open="isOpen" title="Delete Story" description="Are you sure you want to delete this story?"
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
                                You are about to delete <strong>{{ story?.title }}</strong>. This action cannot be
                                undone.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton label="Delete Story" color="error" @click="deleteStory" :loading="isDeleting" />
                </div>
            </div>
        </template>
    </UModal>
</template>
