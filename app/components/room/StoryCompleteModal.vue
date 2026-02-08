<script lang="ts" setup>
const props = defineProps<{
    modelValue: boolean
    story: {
        id: string
        title: string
    } | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm'): void
}>()

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

function confirm() {
    emit('confirm')
    isOpen.value = false
}
</script>

<template>
    <UModal v-model:open="isOpen" title="Complete Story"
        description="Are you sure you want to complete this story?" :ui="{ content: 'sm:max-w-md' }">
        <template #body>
            <div class="flex flex-col gap-4">
                <div
                    class="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-900">
                    <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                            <h3 class="text-sm font-medium text-amber-800 dark:text-amber-200">This action is
                                irreversible</h3>
                            <p class="text-sm text-amber-600 dark:text-amber-300 mt-1">
                                Completing <strong>{{ story?.title }}</strong> will lock it. You won't be able to
                                re-activate or edit it afterwards.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton label="Complete Story" color="success" icon="i-lucide-check-circle" @click="confirm" />
                </div>
            </div>
        </template>
    </UModal>
</template>
