<script lang="ts" setup>
import { useClipboard } from '@vueuse/core'
import type { Player } from '~/types/room'

const { copy } = useClipboard()
const toast = useToast()
const user = useSupabaseUser()

const props = defineProps<{
    players: Player[],
    activeStory: any,
    isVoted: boolean,
    votes: Record<string, string>,
    room: {
        name?: string | null,
        description?: string | null
    } | null
}>()

function playerHasVoted(id: string): boolean {
    return props.votes[id] !== undefined
}

function playerVote(id: string): string | undefined {
    return props.votes[id]
}

const bannerText = computed(() => {
    if (props.activeStory?.status === 'voting') {
        const allVoted = props.players.length > 0 && props.players.every(player => playerHasVoted(player.id))
        return allVoted
            ? 'Waiting for moderator to finalise vote'
            : 'Waiting for players to vote...'
    }
    return null
})

function copyRoomUrl() {
    const inviteUrl = new URL(window.location.href)

    if (props.room?.name) {
        inviteUrl.searchParams.set('roomName', props.room.name)
    }

    if (props.room?.description) {
        inviteUrl.searchParams.set('roomDescription', props.room.description)
    }

    copy(inviteUrl.toString())
    toast.add({ title: 'Copied!', description: 'Room URL copied to clipboard.', color: 'success' })
}
</script>

<template>
    <div
        class="lg:col-span-1 flex flex-col h-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <!-- Status Banner -->
        <div v-if="bannerText" class="bg-primary-500 text-white p-4 text-center">
            <p class="text-sm font-medium">{{ bannerText }}</p>
        </div>

        <!-- Timer & Header -->
        <div class="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <h2 class="font-medium text-neutral-900 dark:text-white">Players:</h2>
            <RoomTimer :story="activeStory" />
        </div>

        <!-- Player List -->
        <div class="flex-1 overflow-y-auto">
            <div v-for="player in players" :key="player.id"
                class="flex items-center justify-between p-4 border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                <div class="flex items-center gap-3">
                    <UChip
                        size="md"
                        position="bottom-right"
                        inset
                        :color="player.isOnline ? 'success' : 'error'">
                        <UAvatar :src="player.avatar" :alt="player.name" size="md" />
                    </UChip>
                    <div class="flex flex-col">
                        <div class="flex items-center gap-1.5">
                            <span class="text-sm font-medium text-neutral-900 dark:text-white min-h-5">{{
                                player.name }}</span>
                        </div>
                    </div>
                    <UIcon v-if="playerHasVoted(player.id)" name="i-lucide-circle-check"
                        class="w-4.5 h-4.5 text-primary-500 flex items-center justify-center" />
                </div>
                <div class="flex items-center gap-2">                    
                    <div class="text-lg font-medium text-neutral-700 dark:text-neutral-300">
                        <template v-if="isVoted || player.id === user?.sub">
                            <UIcon v-if="playerVote(player.id) === 'coffee'" name="i-lucide-coffee"
                                class="w-6 h-6 text-neutral-900 dark:text-white" />
                            <span v-else>{{ playerVote(player.id) }}</span>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <!-- Invite Section -->
        <div class="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <UButton block color="neutral" variant="soft" icon="i-lucide-copy" label="Invite a teammate"
                @click="copyRoomUrl" />
        </div>
    </div>
</template>
