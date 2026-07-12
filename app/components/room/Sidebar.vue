<script lang="ts" setup>
import { useClipboard } from '@vueuse/core'
import type { Player, RoomConnectionStatus } from '~/types/room'

const { copy } = useClipboard()
const toast = useToast()
const { user } = useCurrentUser()

const props = defineProps<{
    players: Player[],
    activeStory: any,
    isVoted: boolean,
    votes: Record<string, string>,
    room: {
        name?: string | null,
        description?: string | null
    } | null,
    connectionStatus: RoomConnectionStatus
}>()

const emit = defineEmits<{
    'poke-users': []
}>()

function playerHasVoted(id: string): boolean {
    return props.votes[id] !== undefined
}

function playerVote(id: string): string | undefined {
    return props.votes[id]
}

const bannerText = computed(() => {
    if (props.activeStory?.status === 'voting') {
        const onlinePlayers = props.players.filter(player => player.isOnline)
        const allVoted = onlinePlayers.length > 0 && onlinePlayers.every(player => playerHasVoted(player.id))
        return allVoted
            ? 'Waiting for moderator to finalise vote'
            : 'Waiting for players to vote...'
    }
    return null
})

const connectionBadge = computed(() => {
    if (props.connectionStatus === 'connected') {
        return { label: 'Live', color: 'success' as const, icon: 'i-lucide-radio' }
    }
    if (props.connectionStatus === 'connecting' || props.connectionStatus === 'reconnecting') {
        return { label: 'Reconnecting', color: 'warning' as const, icon: 'i-lucide-loader-circle' }
    }
    return { label: 'Offline', color: 'neutral' as const, icon: 'i-lucide-wifi-off' }
})

const onlinePlayers = computed(() => props.players.filter(player => player.isOnline))
const votedCount = computed(() => onlinePlayers.value.filter(player => playerHasVoted(player.id)).length)
const voteProgress = computed(() => {
    if (onlinePlayers.value.length === 0) return 0
    return Math.round((votedCount.value / onlinePlayers.value.length) * 100)
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
    <aside class="room-sidebar">
        <div class="sidebar-heading">
            <span>PLAYERS</span>
            <b>{{ players.length }}</b>
        </div>

        <div class="connection-state" :class="connectionStatus">
            <i />
            {{ connectionBadge.label }}
        </div>

        <p v-if="bannerText" class="status-banner">{{ bannerText }}</p>

        <div class="player-list">
            <div v-for="player in players" :key="player.id" class="player">
                <UAvatar :src="player.avatar" :alt="player.name" size="sm" class="player-avatar" />
                <div class="player-info">
                    <b>{{ player.name }}</b>
                    <small>{{ player.isModerator ? "Facilitator" : player.isOnline ? "Online" : "Offline" }}</small>
                </div>
                <div v-if="isVoted || player.id === user?.id" class="player-vote">
                    <UIcon v-if="playerVote(player.id) === '☕'" name="i-lucide-coffee" />
                    <span v-else>{{ playerVote(player.id) }}</span>
                </div>
                <i v-else class="vote-dot" :class="{ voted: playerHasVoted(player.id) }" />
            </div>
        </div>

        <div class="sidebar-footer">
            <div class="vote-progress">
                <div>
                    <span>VOTE PROGRESS</span>
                    <b>{{ votedCount }}/{{ onlinePlayers.length }}</b>
                </div>
                <div class="progress-track"><i :style="{ width: `${voteProgress}%` }" /></div>
            </div>

            <UButton
                block
                color="neutral"
                variant="outline"
                icon="i-lucide-copy"
                label="Invite teammate"
                @click="copyRoomUrl"
            />
            <UButton
                block
                color="neutral"
                variant="ghost"
                icon="i-lucide-bird"
                label="Poke team"
                @click="emit('poke-users')"
            />
        </div>
    </aside>
</template>

<style scoped>
.room-sidebar { display: flex; min-width: 0; flex-direction: column; padding: 1.4rem 1rem 1rem; border-left: 1px solid rgba(255, 255, 255, 0.09); background: #0c0c0f; }
.sidebar-heading { display: flex; align-items: center; justify-content: space-between; color: #666670; font-size: 0.62rem; letter-spacing: 0.14em; }
.sidebar-heading b { display: grid; width: 1.4rem; height: 1.4rem; place-items: center; color: #a1a1aa; border: 1px solid #29292f; font-weight: 500; }
.connection-state { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.65rem; color: #71717a; font-size: 0.55rem; letter-spacing: 0.1em; text-transform: uppercase; }
.connection-state i { width: 5px; height: 5px; border-radius: 999px; background: #52525b; }
.connection-state.connected i { background: #22c55e; box-shadow: 0 0 9px rgba(34, 197, 94, 0.8); }
.connection-state.connecting i, .connection-state.reconnecting i { background: #f59e0b; }
.status-banner { margin-top: 1rem; padding: 0.65rem; color: #93c5fd; font-size: 0.58rem; line-height: 1.55; border: 1px solid rgba(59, 130, 246, 0.18); background: rgba(37, 99, 235, 0.06); }
.player-list { display: grid; gap: 0.35rem; margin-top: 1.25rem; }
.player { display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; gap: 0.7rem; align-items: center; min-height: 3.25rem; padding: 0.55rem; border: 1px solid transparent; transition: border-color 160ms ease, background-color 160ms ease; }
.player:hover { border-color: #25252b; background: #101014; }
.player-avatar { border-radius: 0; }
.player-info { min-width: 0; }
.player-info b, .player-info small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-info b { color: #c7c7ce; font-size: 0.68rem; font-weight: 500; }
.player-info small { margin-top: 0.15rem; color: #4d4d56; font-size: 0.54rem; }
.vote-dot { width: 6px; height: 6px; border-radius: 999px; background: #303038; }
.vote-dot.voted { background: #2563eb; box-shadow: 0 0 9px rgba(37, 99, 235, 0.8); }
.player-vote { min-width: 1.2rem; color: #93c5fd; font-size: 0.8rem; text-align: center; }
.player-vote :deep(svg) { width: 0.9rem; height: 0.9rem; }
.sidebar-footer { display: grid; gap: 0.55rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.07); }
.vote-progress { margin-bottom: 0.55rem; }
.vote-progress > div:first-child { display: flex; justify-content: space-between; color: #5c5c65; font-size: 0.58rem; letter-spacing: 0.12em; }
.vote-progress b { color: #a1a1aa; font-size: 0.62rem; font-weight: 500; letter-spacing: 0; }
.progress-track { height: 2px; margin-top: 0.7rem; overflow: hidden; background: #202026; }
.progress-track i { display: block; height: 100%; background: #2563eb; box-shadow: 0 0 10px #2563eb; transition: width 300ms ease; }
.sidebar-footer :deep(button) { border-radius: 0; font-size: 0.65rem; }

@media (max-width: 760px) {
    .room-sidebar { min-height: 20rem; border-top: 1px solid rgba(255, 255, 255, 0.09); border-left: 0; }
    .player-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sidebar-footer { margin-top: 1.5rem; }
}

@media (max-width: 420px) {
    .player-list { grid-template-columns: 1fr; }
}
</style>
