<script lang="ts" setup>
import type { Database } from '~/types/database.types'

interface TransferCandidate {
    id: string
    name: string
    avatar: string
    isOnline: boolean
}

const props = defineProps<{
    modelValue: boolean
    room: {
        id: string
        name: string
        description: string | null
        created_by: string | null
    } | null
    transferCandidates: TransferCandidate[]
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
const selectedTransferTargetId = ref<string | null>(null)
const isTransferArmed = ref(false)
const isTransferring = ref(false)

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const hasTransferCandidates = computed(() => props.transferCandidates.length > 0)

const selectedTransferTarget = computed(() => {
    if (!selectedTransferTargetId.value) return null
    return (
        props.transferCandidates.find((candidate) => candidate.id === selectedTransferTargetId.value) ??
        null
    )
})

watch(() => props.modelValue, (val) => {
    if (val && props.room) {
        editName.value = props.room.name
        editDescription.value = props.room.description || ''
        selectedTransferTargetId.value = null
        isTransferArmed.value = false
        isTransferring.value = false
    }
})

watch(
    () => props.transferCandidates,
    (candidates) => {
        if (!selectedTransferTargetId.value) return

        const hasSelectedTarget = candidates.some(
            (candidate) => candidate.id === selectedTransferTargetId.value,
        )
        if (!hasSelectedTarget) {
            selectedTransferTargetId.value = null
            isTransferArmed.value = false
        }
    },
    { deep: true },
)

function selectTransferTarget(candidateId: string) {
    if (isTransferring.value) return

    selectedTransferTargetId.value = candidateId
    isTransferArmed.value = false
}

function armTransferConfirmation() {
    if (!selectedTransferTarget.value || isUpdating.value || isTransferring.value) return
    isTransferArmed.value = true
}

function cancelTransferConfirmation() {
    if (isTransferring.value) return
    isTransferArmed.value = false
}

async function transferAdmin() {
    if (!props.room || !selectedTransferTarget.value) return

    isTransferring.value = true
    const { error: transferError } = await client
        .from('rooms')
        .update({
            created_by: selectedTransferTarget.value.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', props.room.id)

    isTransferring.value = false

    if (transferError) {
        const isAnonymousTransferBlocked = transferError.code === '42501'
        toast.add({
            title: 'Error',
            description: isAnonymousTransferBlocked
                ? 'Guest users must finish signup before they can become room admin.'
                : transferError.message,
            color: 'error',
        })
        return
    }

    toast.add({
        title: 'Admin transferred',
        description: `${selectedTransferTarget.value.name} is now the room admin.`,
        color: 'success',
    })
    emit('success')
    isOpen.value = false
}

async function updateRoom() {
    if (!editName.value.trim() || !props.room) return

    isUpdating.value = true
    const { error: updateError } = await client
        .from('rooms')
        .update({
            name: editName.value,
            description: editDescription.value,
            updated_at: new Date().toISOString(),
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
    <UModal
        v-model:open="isOpen"
        title="Edit Room"
        description="Update room details."
        :ui="{ content: 'sm:max-w-2xl' }"
    >
        <template #body>
            <div class="flex flex-col gap-5">
                <UFormField label="Room Name" required>
                    <UInput
                        v-model="editName"
                        placeholder="Room name"
                        @keydown.enter="updateRoom"
                        class="w-full"
                        autofocus
                    />
                </UFormField>

                <UFormField label="Description">
                    <UTextarea
                        v-model="editDescription"
                        placeholder="Description..."
                        :rows="3"
                        class="w-full"
                    />
                </UFormField>

                <USeparator />

                <div class="space-y-4">
                    <div class="space-y-1">
                        <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            Transfer Admin Rights
                        </h3>
                        <p class="text-xs text-neutral-500 dark:text-neutral-400">
                            Choose a joined participant to become the new room admin.
                        </p>
                    </div>

                    <div
                        v-if="!hasTransferCandidates"
                        class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-3"
                    >
                        <p class="text-sm text-neutral-600 dark:text-neutral-300">
                            No eligible participants are available. Invite someone and have them join this room first.
                        </p>
                    </div>

                    <div v-else class="space-y-2 max-h-48 overflow-y-auto pr-1">
                        <button
                            v-for="candidate in transferCandidates"
                            :key="candidate.id"
                            type="button"
                            class="w-full rounded-lg border p-2.5 transition-colors flex items-center justify-between"
                            :class="selectedTransferTargetId === candidate.id
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'"
                            @click="selectTransferTarget(candidate.id)"
                        >
                            <div class="flex items-center gap-3">
                                <UChip
                                    size="sm"
                                    position="bottom-right"
                                    inset
                                    :color="candidate.isOnline ? 'success' : 'neutral'"
                                >
                                    <UAvatar :src="candidate.avatar" :alt="candidate.name" size="sm" />
                                </UChip>
                                <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                    {{ candidate.name }}
                                </span>
                            </div>
                            <UIcon
                                v-if="selectedTransferTargetId === candidate.id"
                                name="i-lucide-circle-check"
                                class="w-5 h-5 text-primary-500"
                            />
                        </button>
                    </div>

                    <div
                        class="rounded-lg border border-warning-200 dark:border-warning-900 bg-warning-50 dark:bg-warning-950/40 p-3 space-y-3"
                    >
                        <p class="text-sm text-warning-800 dark:text-warning-200">
                            Transfer immediately removes your admin controls and grants them to the selected user.
                        </p>

                        <template v-if="!isTransferArmed">
                            <div class="flex justify-end">
                                <UButton
                                    label="Review Transfer"
                                    color="warning"
                                    variant="soft"
                                    :disabled="!selectedTransferTarget || isUpdating || isTransferring"
                                    @click="armTransferConfirmation"
                                />
                            </div>
                        </template>

                        <template v-else>
                            <div class="rounded-md border border-warning-300 dark:border-warning-800 p-2.5">
                                <p class="text-sm text-warning-900 dark:text-warning-100">
                                    Confirm transfer to
                                    <strong>{{ selectedTransferTarget?.name }}</strong>.
                                </p>
                            </div>
                            <div class="flex justify-end gap-2">
                                <UButton
                                    label="Back"
                                    color="neutral"
                                    variant="ghost"
                                    :disabled="isTransferring"
                                    @click="cancelTransferConfirmation"
                                />
                                <UButton
                                    label="Confirm Transfer"
                                    color="error"
                                    :disabled="!selectedTransferTarget || isUpdating"
                                    :loading="isTransferring"
                                    @click="transferAdmin"
                                />
                            </div>
                        </template>
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
                    <UButton
                        label="Save Changes"
                        color="primary"
                        @click="updateRoom"
                        :disabled="!editName.trim() || isTransferring"
                        :loading="isUpdating"
                    />
                </div>
            </div>
        </template>
    </UModal>
</template>
