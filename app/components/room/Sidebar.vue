<script lang="ts" setup>
import type { Player, RoomConnectionStatus } from '~/types/room'

const { user } = useCurrentUser()

const props = defineProps<{
    players: Player[],
    activeStory: any,
    isVoted: boolean,
    votes: Record<string, string>,
    connectionStatus: RoomConnectionStatus,
    canPoke: boolean
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
                    <small class="player-presence" :class="player.isOnline ? 'online' : 'offline'">
                        <i aria-hidden="true" />
                        <span>{{ player.isOnline ? "Online" : "Offline" }}</span>
                        <span v-if="player.isAnonymous" class="player-role">· Guest</span>
                        <span v-if="player.isModerator" class="player-role">· Facilitator</span>
                    </small>
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
                v-if="canPoke"
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
.room-sidebar { display: flex; min-width: 0; flex-direction: column; padding: 1.5rem 1.1rem 1.1rem; border-left: 1px solid rgba(255, 255, 255, 0.12); background: #0c0c0f; }
.sidebar-heading { display: flex; align-items: center; justify-content: space-between; color: #a8a8b2; font-size: 0.7rem; letter-spacing: 0.14em; }
.sidebar-heading b { display: grid; width: 1.55rem; height: 1.55rem; place-items: center; color: #c4c4cc; border: 1px solid #3a3a42; font-size: 0.72rem; font-weight: 500; }
.connection-state { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.7rem; color: #a1a1aa; font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; }
.connection-state i { width: 6px; height: 6px; border-radius: 999px; background: currentColor; box-shadow: 0 0 9px currentColor; }
.connection-state.connected { color: #86efac; }
.connection-state.connecting, .connection-state.reconnecting { color: #fcd34d; }
.status-banner { margin-top: 1rem; padding: 0.7rem; color: #a8ceff; font-size: 0.68rem; line-height: 1.55; border: 1px solid rgba(59, 130, 246, 0.28); background: rgba(37, 99, 235, 0.08); }
.player-list { display: grid; gap: 0.35rem; margin-top: 1.25rem; }
.player { display: grid; grid-template-columns: 2rem minmax(0, 1fr) auto; gap: 0.7rem; align-items: center; min-height: 3.25rem; padding: 0.55rem; border: 1px solid transparent; transition: border-color 160ms ease, background-color 160ms ease; }
.player:hover { border-color: #25252b; background: #101014; }
.player-avatar { border-radius: 0; }
.player-info { min-width: 0; }
.player-info b, .player-info small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-info b { color: #ededf0; font-size: 0.78rem; font-weight: 500; }
.player-info .player-presence { display: flex; align-items: center; gap: 0.3rem; margin-top: 0.18rem; font-size: 0.63rem; }
.player-presence i { width: 5px; height: 5px; flex: 0 0 auto; border-radius: 999px; background: currentColor; box-shadow: 0 0 7px currentColor; }
.player-presence.online { color: #86efac; }
.player-presence.offline { color: #a1a1aa; }
.player-role { color: #b4b4bd; }
.vote-dot { width: 6px; height: 6px; border-radius: 999px; background: #303038; }
.vote-dot.voted { background: #2563eb; box-shadow: 0 0 9px rgba(37, 99, 235, 0.8); }
.player-vote { min-width: 1.2rem; color: #9fc9ff; font-size: 0.9rem; text-align: center; }
.player-vote :deep(svg) { width: 0.9rem; height: 0.9rem; }
.sidebar-footer { display: grid; gap: 0.55rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.07); }
.vote-progress { margin-bottom: 0.55rem; }
.vote-progress > div:first-child { display: flex; justify-content: space-between; color: #a8a8b2; font-size: 0.66rem; letter-spacing: 0.12em; }
.vote-progress b { color: #c4c4cc; font-size: 0.7rem; font-weight: 500; letter-spacing: 0; }
.progress-track { height: 2px; margin-top: 0.7rem; overflow: hidden; background: #202026; }
.progress-track i { display: block; height: 100%; background: #2563eb; box-shadow: 0 0 10px #2563eb; transition: width 300ms ease; }
.sidebar-footer :deep(button) { border-radius: 0; font-size: 0.72rem; }

@media (max-width: 760px) {
    .room-sidebar { min-height: 20rem; border-top: 1px solid rgba(255, 255, 255, 0.09); border-left: 0; }
    .player-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sidebar-footer { margin-top: 1.5rem; }
}

@media (max-width: 420px) {
    .player-list { grid-template-columns: 1fr; }
}
</style>
