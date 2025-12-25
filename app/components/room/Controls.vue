<script lang="ts" setup>
defineProps<{
    canEdit: boolean
}>()

const emit = defineEmits<{
    (e: 'new-story'): void
    (e: 'edit-room'): void
    (e: 'delete-room'): void
}>()

const settingsItems = computed(() => [
    [{
        label: 'Poke Users',
        icon: 'i-lucide-megaphone',
        onSelect: () => {
            const audio = new Audio('/cawcaw.mp3')
            audio.play()
        }
    }],
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
])
</script>

<template>
    <div class="flex items-center self-center gap-2">
        <UButton v-if="canEdit" label="New Story" icon="i-lucide-plus" color="primary" size="sm"
            @click="emit('new-story')" />

        <UDropdownMenu v-if="canEdit" :items="settingsItems" :content="{ align: 'end', side: 'bottom' }">
            <UButton icon="i-lucide-settings" color="neutral" variant="ghost" size="sm" />
        </UDropdownMenu>
    </div>
</template>
