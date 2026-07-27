import type { CardDeckId } from "~/utils/card-decks"

export type StoryStatus = 'pending' | 'active' | 'voting' | 'voted' | 'completed'

/**
 * `realtime` is the original facilitator-driven ceremony: one story open at a
 * time, revealed on the admin's command. `async` opens many stories at once and
 * closes each on its own once every expected voter has voted.
 */
export type RoomMode = 'realtime' | 'async'

/**
 * How a story's final estimate was chosen: ratified from a unanimous vote,
 * picked by the facilitator, or the legacy mechanical mean.
 */
export type FinalEstimateSource = 'consensus' | 'manual' | 'average'

export type VotesMap = Record<string, string>

export interface Room {
    id: string
    name: string
    description: string | null
    adminUserId: string
    mode: RoomMode
    cardDeckId: CardDeckId
    cardValues: string[]
    createdAt: string
    updatedAt: string
    created_at: string
    updated_at: string
}

export interface Story {
    id: string
    roomId: string
    room_id: string
    title: string
    status: StoryStatus
    sortOrder: number
    finalEstimate: number | null
    finalEstimateLabel: string | null
    finalEstimateSource: FinalEstimateSource | null
    voteAverage: number | null
    voteCount: number
    votingOpenedAt: string | null
    votingDeadlineAt: string | null
    /** Votes are revealed but the team disagreed, so a facilitator must pick. */
    needsResolution: boolean
    /** Only populated while a story is `voting`, to keep snapshots small. */
    expectedVoterIds?: string[]
    createdAt: string
    updatedAt: string
    created_at: string
    updated_at: string
}

export interface Profile {
    userId: string
    user_id: string
    name: string
    avatar: string | null
}

export interface StoryVoteSnapshot {
    storyId: string
    story_id: string
    userId: string
    user_id: string
    voteValue: string
    vote_value: string
    createdAt: string
    created_at: string
}

export interface Player {
    id: string
    name: string
    avatar: string
    isModerator: boolean
    isOnline: boolean
    isAnonymous: boolean
}

export interface TransferCandidate {
    id: string
    name: string
    avatar: string
    isOnline: boolean
    isAnonymous: boolean
}

export interface ConnectedRoomUser {
    id: string
    name: string
    avatar: string
}

export interface RoomRealtimeState {
    room: Room | null
    stories: Story[]
    players: Player[]
}

export interface StoryVoteProgress {
    voted: number
    expected: number
    voterIds: string[]
}

export interface RoomRealtimeSnapshot extends RoomRealtimeState {
    /** The single active story's votes. Unchanged, for realtime rooms. */
    votes: VotesMap
    /** Per-story votes, viewer-masked. Async rooms only; absent otherwise. */
    storyVotes?: Record<string, VotesMap>
    voteProgress?: Record<string, StoryVoteProgress>
}

export interface RoomSocketBootstrap {
    syncSequence: number
    user: ConnectedRoomUser
    state: RoomRealtimeState
}

export type RoomRealtimeServerMessage =
    | ({ type: 'snapshot', revision: number } & RoomRealtimeSnapshot)
    | { type: 'presence', players: Player[] }
    | { type: 'votes', storyId: string, votes: VotesMap, progress?: StoryVoteProgress }
    | { type: 'poke', id: string, fromUserId: string }
    | { type: 'room_deleted' }
    | { type: 'error', code: string, message: string }

export type RoomConnectionStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'disconnected'
