<script lang="ts" setup>
const { canEdit } = defineProps<{
    canEdit: boolean
}>()

const emit = defineEmits<{
    (e: 'invite-teammate'): void
    (e: 'edit-room'): void
    (e: 'delete-room'): void
}>()

const settingsItems = computed(() => {
    const inviteItems = [{
        label: 'Invite teammate',
        icon: 'i-lucide-copy',
        onSelect: () => emit('invite-teammate')
    }]

    if (!canEdit) return []

    return [
        inviteItems,
        [{
            label: 'Edit Room Details',
            icon: 'i-lucide-pencil',
            onSelect: () => emit('edit-room')
        }],
        [{
            label: 'Delete Room',
            icon: 'i-lucide-trash-2',
            color: 'error' as const,
            onSelect: () => emit('delete-room')
        }]
    ]
})
</script>

<template>
    <div class="room-controls">
        <div v-if="$slots.default" class="room-actions">
            <slot />
        </div>

        <UDropdownMenu v-if="canEdit" :items="settingsItems" :content="{ align: 'end', side: 'bottom' }">
            <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" size="sm" aria-label="Room settings" />
        </UDropdownMenu>
    </div>
</template>

<style scoped>
.room-controls { display: flex; align-items: center; gap: 0.35rem; }
.room-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.4rem; }
.room-controls :deep(button) { border-radius: 0; }

@media (max-width: 520px) {
    .room-controls { align-items: flex-start; }
    .room-actions { max-width: 11rem; }
}
</style>
