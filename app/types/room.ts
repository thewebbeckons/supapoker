import type { Database } from './database.types'

export type Story = Database['public']['Tables']['stories']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type Profile = Database['public']['Tables']['profile']['Row']
export type StoryVote = Database['public']['Tables']['story_votes']['Row']

export type StoryStatus = 'pending' | 'active' | 'voting' | 'voted' | 'completed'

export type VotesMap = Record<string, string>

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
