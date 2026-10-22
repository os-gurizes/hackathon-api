import { Type } from 'typebox'

declare const brand: unique symbol

export type Brand<T, B extends string> = T & { readonly [brand]: B }

export type PlayerId = Brand<number, 'PlayerId'>
export type TeamId = Brand<number, 'TeamId'>
export type MatchId = Brand<number, 'MatchId'>
export type RoundId = Brand<number, 'RoundId'>
export type MapId = Brand<number, 'MapId'>
export type AgentId = Brand<number, 'AgentId'>
export type WeaponId = Brand<number, 'WeaponId'>
export type TournamentId = Brand<number, 'TournamentId'>
export type StageId = Brand<number, 'StageId'>
export type SeriesId = Brand<number, 'SeriesId'>
export type UserId = Brand<number, 'UserId'>
export type StrategyId = Brand<number, 'StrategyId'>

export const asPlayerId = (value: number) => value as PlayerId
export const asTeamId = (value: number) => value as TeamId
export const asMatchId = (value: number) => value as MatchId
export const asRoundId = (value: number) => value as RoundId
export const asMapId = (value: number) => value as MapId
export const asAgentId = (value: number) => value as AgentId
export const asWeaponId = (value: number) => value as WeaponId
export const asTournamentId = (value: number) => value as TournamentId
export const asStageId = (value: number) => value as StageId
export const asSeriesId = (value: number) => value as SeriesId
export const asUserId = (value: number) => value as UserId
export const asStrategyId = (value: number) => value as StrategyId

export const MAX_INTEGER_ID = 2147483647
export const MAX_SMALL_ID = 32767

export const Id = Type.Integer({ minimum: 1, maximum: MAX_INTEGER_ID })
export const IdParams = Type.Object({ id: Id })
