export type StoryStatus = 'pending' | 'active' | 'voting' | 'voted' | 'completed'

export type VotesMap = Record<string, string>

export interface Room {
    id: string
    name: string
    description: string | null
    adminUserId: string
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
