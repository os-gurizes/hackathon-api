import { describe, expect, it } from 'vitest'

import {
  canEditTeam,
  canViewPlayerPrivate,
  canViewTeamAnalytics,
  type Viewer,
} from '../src/plugins/access.js'
import { useApp } from './helpers.js'

const TAEK = 10
const GOLDEN = 3
const OTHER_PLAYER = 14
const OTHER_TEAM = 1

const viewer = (role: Viewer['role'], playerId: number | null, teamId: number | null): Viewer => ({
  id: 1,
  role,
  playerId,
  teamId,
})

describe('regras de acesso', () => {
  const app = useApp()

  it('player vê só os próprios dados e os times pelos quais jogou', async () => {
    const taek = viewer('player', TAEK, GOLDEN)
    expect(await canViewPlayerPrivate(app().db, taek, TAEK)).toBe(true)
    expect(await canViewPlayerPrivate(app().db, taek, OTHER_PLAYER)).toBe(false)
    expect(await canViewTeamAnalytics(app().db, taek, GOLDEN)).toBe(true)
    expect(await canViewTeamAnalytics(app().db, taek, OTHER_TEAM)).toBe(false)
  })

  it('coach vê dados individuais do próprio elenco e analisa qualquer time', async () => {
    const coach = viewer('coach', null, GOLDEN)
    expect(await canViewPlayerPrivate(app().db, coach, TAEK)).toBe(true)
    expect(await canViewPlayerPrivate(app().db, coach, OTHER_PLAYER)).toBe(false)
    expect(await canViewTeamAnalytics(app().db, coach, OTHER_TEAM)).toBe(true)
    expect(canEditTeam(coach, GOLDEN)).toBe(true)
    expect(canEditTeam(coach, OTHER_TEAM)).toBe(false)
  })

  it('admin vê e edita tudo', async () => {
    const admin = viewer('admin', null, null)
    expect(await canViewPlayerPrivate(app().db, admin, OTHER_PLAYER)).toBe(true)
    expect(canEditTeam(admin, OTHER_TEAM)).toBe(true)
  })
})
