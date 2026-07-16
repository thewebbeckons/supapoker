import type { CardDeckId } from "~/utils/card-decks"

export type StoryStatus = 'pending' | 'active' | 'voting' | 'voted' | 'completed'

export type VotesMap = Record<string, string>

export interface Room {
    id: string
    name: string
    description: string | null
    adminUserId: string
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
    voteAverage: number | null
    voteCount: number
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
}

export interface TransferCandidate {
    id: string
    name: string
    avatar: string
    isOnline: boolean
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

export interface RoomRealtimeSnapshot extends RoomRealtimeState {
    votes: VotesMap
}

export interface RoomSocketBootstrap {
    syncSequence: number
    user: ConnectedRoomUser
    state: RoomRealtimeState
}

export type RoomRealtimeServerMessage =
    | ({ type: 'snapshot', revision: number } & RoomRealtimeSnapshot)
    | { type: 'presence', players: Player[] }
    | { type: 'votes', storyId: string, votes: VotesMap }
    | { type: 'poke', id: string, fromUserId: string }
    | { type: 'room_deleted' }
    | { type: 'error', code: string, message: string }

export type RoomConnectionStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'disconnected'
