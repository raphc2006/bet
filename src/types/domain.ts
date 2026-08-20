import type { Tables } from './database'

export type BetStatus = 'pending' | 'won' | 'lost' | 'push'
export type BetType = 'single' | 'parlay'

export type BetLeg = Tables<'bet_legs'>
export type Bet = Tables<'bets'> & { bet_legs: BetLeg[] }
export type Bankroll = Tables<'bankrolls'>
export type BankrollAdjustment = Tables<'bankroll_adjustments'>
export type Profile = Tables<'profiles'>
export type Friendship = Tables<'friendships'>
export type Conversation = Tables<'conversations'>
export type ConversationMember = Tables<'conversation_members'>
export type Message = Tables<'messages'>
