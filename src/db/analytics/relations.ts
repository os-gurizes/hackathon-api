import { relations } from 'drizzle-orm/relations'
import {
  tournaments,
  stages,
  series,
  teams,
  matches,
  maps,
  rounds,
  players,
  zones,
  ingestRuns,
  dataQualityReport,
  kills,
  weapons,
  economyFlags,
  killImpact,
  strategies,
  insights,
  playerPatterns,
  killAssists,
  mapSites,
  roundStrategy,
  mapCallouts,
  damageEvents,
  agents,
  abilityKills,
  roundWpStates,
  agentMapStats,
  positionSamples,
  roundPlayerStats,
  pressureStats,
  rotations,
  heatmapZones,
  combos,
  matchPlayers,
  heatmapCells,
  roundTeamEconomy,
  roundPlayers,
  abilityUsage,
  weaponStats,
  playerMatchStats,
} from './schema.js'

export const stagesInAnalyticsRelations = relations(stages, ({ one, many }) => ({
  tournamentsInAnalytic: one(tournaments, {
    fields: [stages.tournamentId],
    references: [tournaments.id],
  }),
  series: many(series),
  pressureStats: many(pressureStats),
  heatmapZones: many(heatmapZones),
  combos: many(combos),
  heatmapCells: many(heatmapCells),
  roundTeamEconomy: many(roundTeamEconomy),
  weaponStats: many(weaponStats),
  playerMatchStats: many(playerMatchStats),
}))

export const tournamentsInAnalyticsRelations = relations(tournaments, ({ many }) => ({
  stages: many(stages),
}))

export const seriesInAnalyticsRelations = relations(series, ({ one, many }) => ({
  stagesInAnalytic: one(stages, {
    fields: [series.stageId],
    references: [stages.id],
  }),
  teamsInAnalytic_teamAId: one(teams, {
    fields: [series.teamAId],
    references: [teams.id],
    relationName: 'seriesInAnalytics_teamAId_teamsInAnalytics_id',
  }),
  teamsInAnalytic_teamBId: one(teams, {
    fields: [series.teamBId],
    references: [teams.id],
    relationName: 'seriesInAnalytics_teamBId_teamsInAnalytics_id',
  }),
  teamsInAnalytic_winnerTeamId: one(teams, {
    fields: [series.winnerTeamId],
    references: [teams.id],
    relationName: 'seriesInAnalytics_winnerTeamId_teamsInAnalytics_id',
  }),
  matches: many(matches),
}))

export const teamsInAnalyticsRelations = relations(teams, ({ many }) => ({
  seriesInAnalytics_teamAId: many(series, {
    relationName: 'seriesInAnalytics_teamAId_teamsInAnalytics_id',
  }),
  seriesInAnalytics_teamBId: many(series, {
    relationName: 'seriesInAnalytics_teamBId_teamsInAnalytics_id',
  }),
  seriesInAnalytics_winnerTeamId: many(series, {
    relationName: 'seriesInAnalytics_winnerTeamId_teamsInAnalytics_id',
  }),
  matchesInAnalytics_blueTeamId: many(matches, {
    relationName: 'matchesInAnalytics_blueTeamId_teamsInAnalytics_id',
  }),
  matchesInAnalytics_redTeamId: many(matches, {
    relationName: 'matchesInAnalytics_redTeamId_teamsInAnalytics_id',
  }),
  matchesInAnalytics_winnerTeamId: many(matches, {
    relationName: 'matchesInAnalytics_winnerTeamId_teamsInAnalytics_id',
  }),
  roundsInAnalytics_attackTeamId: many(rounds, {
    relationName: 'roundsInAnalytics_attackTeamId_teamsInAnalytics_id',
  }),
  roundsInAnalytics_defenseTeamId: many(rounds, {
    relationName: 'roundsInAnalytics_defenseTeamId_teamsInAnalytics_id',
  }),
  roundsInAnalytics_winnerTeamId: many(rounds, {
    relationName: 'roundsInAnalytics_winnerTeamId_teamsInAnalytics_id',
  }),
  economyFlags: many(economyFlags),
  roundStrategy: many(roundStrategy),
  pressureStats: many(pressureStats),
  rotations: many(rotations),
  heatmapZones: many(heatmapZones),
  combos: many(combos),
  matchPlayers: many(matchPlayers),
  heatmapCells: many(heatmapCells),
  roundTeamEconomy: many(roundTeamEconomy),
  roundPlayers: many(roundPlayers),
  abilityUsage: many(abilityUsage),
  weaponStats: many(weaponStats),
  playerMatchStats: many(playerMatchStats),
}))

export const matchesInAnalyticsRelations = relations(matches, ({ one, many }) => ({
  teamsInAnalytic_blueTeamId: one(teams, {
    fields: [matches.blueTeamId],
    references: [teams.id],
    relationName: 'matchesInAnalytics_blueTeamId_teamsInAnalytics_id',
  }),
  mapsInAnalytic: one(maps, {
    fields: [matches.mapId],
    references: [maps.id],
  }),
  teamsInAnalytic_redTeamId: one(teams, {
    fields: [matches.redTeamId],
    references: [teams.id],
    relationName: 'matchesInAnalytics_redTeamId_teamsInAnalytics_id',
  }),
  seriesInAnalytic: one(series, {
    fields: [matches.seriesId],
    references: [series.id],
  }),
  teamsInAnalytic_winnerTeamId: one(teams, {
    fields: [matches.winnerTeamId],
    references: [teams.id],
    relationName: 'matchesInAnalytics_winnerTeamId_teamsInAnalytics_id',
  }),
  rounds: many(rounds),
  abilityKills: many(abilityKills),
  matchPlayers: many(matchPlayers),
  roundTeamEconomy: many(roundTeamEconomy),
  abilityUsage: many(abilityUsage),
  weaponStats: many(weaponStats),
  playerMatchStats: many(playerMatchStats),
}))

export const mapsInAnalyticsRelations = relations(maps, ({ many }) => ({
  matches: many(matches),
  zones: many(zones),
  strategies: many(strategies),
  insights: many(insights),
  playerPatterns: many(playerPatterns),
  mapSites: many(mapSites),
  mapCallouts: many(mapCallouts),
  agentMapStats: many(agentMapStats),
  pressureStats: many(pressureStats),
  rotations: many(rotations),
  heatmapZones: many(heatmapZones),
  combos: many(combos),
  heatmapCells: many(heatmapCells),
  roundTeamEconomy: many(roundTeamEconomy),
  abilityUsage: many(abilityUsage),
  weaponStats: many(weaponStats),
  playerMatchStats: many(playerMatchStats),
}))

export const roundsInAnalyticsRelations = relations(rounds, ({ one, many }) => ({
  teamsInAnalytic_attackTeamId: one(teams, {
    fields: [rounds.attackTeamId],
    references: [teams.id],
    relationName: 'roundsInAnalytics_attackTeamId_teamsInAnalytics_id',
  }),
  teamsInAnalytic_defenseTeamId: one(teams, {
    fields: [rounds.defenseTeamId],
    references: [teams.id],
    relationName: 'roundsInAnalytics_defenseTeamId_teamsInAnalytics_id',
  }),
  playersInAnalytic_defuserId: one(players, {
    fields: [rounds.defuserId],
    references: [players.id],
    relationName: 'roundsInAnalytics_defuserId_playersInAnalytics_id',
  }),
  matchesInAnalytic: one(matches, {
    fields: [rounds.matchId],
    references: [matches.id],
  }),
  zonesInAnalytic: one(zones, {
    fields: [rounds.plantZoneId],
    references: [zones.id],
  }),
  playersInAnalytic_planterId: one(players, {
    fields: [rounds.planterId],
    references: [players.id],
    relationName: 'roundsInAnalytics_planterId_playersInAnalytics_id',
  }),
  teamsInAnalytic_winnerTeamId: one(teams, {
    fields: [rounds.winnerTeamId],
    references: [teams.id],
    relationName: 'roundsInAnalytics_winnerTeamId_teamsInAnalytics_id',
  }),
  kills: many(kills),
  economyFlags: many(economyFlags),
  killImpact: many(killImpact),
  roundStrategy: many(roundStrategy),
  damageEvents: many(damageEvents),
  roundWpStates: many(roundWpStates),
  roundPlayerStats: many(roundPlayerStats),
  rotations: many(rotations),
  roundTeamEconomy: many(roundTeamEconomy),
  roundPlayers: many(roundPlayers),
}))

export const playersInAnalyticsRelations = relations(players, ({ many }) => ({
  roundsInAnalytics_defuserId: many(rounds, {
    relationName: 'roundsInAnalytics_defuserId_playersInAnalytics_id',
  }),
  roundsInAnalytics_planterId: many(rounds, {
    relationName: 'roundsInAnalytics_planterId_playersInAnalytics_id',
  }),
  killsInAnalytics_killerId: many(kills, {
    relationName: 'killsInAnalytics_killerId_playersInAnalytics_id',
  }),
  killsInAnalytics_victimId: many(kills, {
    relationName: 'killsInAnalytics_victimId_playersInAnalytics_id',
  }),
  economyFlags: many(economyFlags),
  killImpactInAnalytics_killerId: many(killImpact, {
    relationName: 'killImpactInAnalytics_killerId_playersInAnalytics_id',
  }),
  killImpactInAnalytics_victimId: many(killImpact, {
    relationName: 'killImpactInAnalytics_victimId_playersInAnalytics_id',
  }),
  playerPatterns: many(playerPatterns),
  killAssists: many(killAssists),
  damageEventsInAnalytics_dealerId: many(damageEvents, {
    relationName: 'damageEventsInAnalytics_dealerId_playersInAnalytics_id',
  }),
  damageEventsInAnalytics_receiverId: many(damageEvents, {
    relationName: 'damageEventsInAnalytics_receiverId_playersInAnalytics_id',
  }),
  abilityKills: many(abilityKills),
  positionSamples: many(positionSamples),
  roundPlayerStats: many(roundPlayerStats),
  pressureStats: many(pressureStats),
  rotations: many(rotations),
  heatmapZones: many(heatmapZones),
  combosInAnalytics_playerA: many(combos, {
    relationName: 'combosInAnalytics_playerA_playersInAnalytics_id',
  }),
  combosInAnalytics_playerB: many(combos, {
    relationName: 'combosInAnalytics_playerB_playersInAnalytics_id',
  }),
  matchPlayers: many(matchPlayers),
  heatmapCells: many(heatmapCells),
  roundPlayers: many(roundPlayers),
  abilityUsage: many(abilityUsage),
  weaponStats: many(weaponStats),
  playerMatchStats: many(playerMatchStats),
}))

export const zonesInAnalyticsRelations = relations(zones, ({ one, many }) => ({
  rounds: many(rounds),
  killsInAnalytics_killerZoneId: many(kills, {
    relationName: 'killsInAnalytics_killerZoneId_zonesInAnalytics_id',
  }),
  killsInAnalytics_victimZoneId: many(kills, {
    relationName: 'killsInAnalytics_victimZoneId_zonesInAnalytics_id',
  }),
  mapsInAnalytic: one(maps, {
    fields: [zones.mapId],
    references: [maps.id],
  }),
  playerPatterns: many(playerPatterns),
  positionSamples: many(positionSamples),
  heatmapZones: many(heatmapZones),
}))

export const dataQualityReportInAnalyticsRelations = relations(dataQualityReport, ({ one }) => ({
  ingestRunsInAnalytic: one(ingestRuns, {
    fields: [dataQualityReport.runId],
    references: [ingestRuns.id],
  }),
}))

export const ingestRunsInAnalyticsRelations = relations(ingestRuns, ({ many }) => ({
  dataQualityReport: many(dataQualityReport),
}))

export const killsInAnalyticsRelations = relations(kills, ({ one, many }) => ({
  playersInAnalytic_killerId: one(players, {
    fields: [kills.killerId],
    references: [players.id],
    relationName: 'killsInAnalytics_killerId_playersInAnalytics_id',
  }),
  zonesInAnalytic_killerZoneId: one(zones, {
    fields: [kills.killerZoneId],
    references: [zones.id],
    relationName: 'killsInAnalytics_killerZoneId_zonesInAnalytics_id',
  }),
  roundsInAnalytic: one(rounds, {
    fields: [kills.roundId],
    references: [rounds.id],
  }),
  playersInAnalytic_victimId: one(players, {
    fields: [kills.victimId],
    references: [players.id],
    relationName: 'killsInAnalytics_victimId_playersInAnalytics_id',
  }),
  zonesInAnalytic_victimZoneId: one(zones, {
    fields: [kills.victimZoneId],
    references: [zones.id],
    relationName: 'killsInAnalytics_victimZoneId_zonesInAnalytics_id',
  }),
  weaponsInAnalytic: one(weapons, {
    fields: [kills.weaponId],
    references: [weapons.id],
  }),
  killImpact: many(killImpact),
  killAssists: many(killAssists),
  roundWpStates: many(roundWpStates),
  positionSamples: many(positionSamples),
}))

export const weaponsInAnalyticsRelations = relations(weapons, ({ many }) => ({
  kills: many(kills),
  roundPlayersInAnalytics_armorId: many(roundPlayers, {
    relationName: 'roundPlayersInAnalytics_armorId_weaponsInAnalytics_id',
  }),
  roundPlayersInAnalytics_weaponId: many(roundPlayers, {
    relationName: 'roundPlayersInAnalytics_weaponId_weaponsInAnalytics_id',
  }),
  weaponStats: many(weaponStats),
}))

export const economyFlagsInAnalyticsRelations = relations(economyFlags, ({ one }) => ({
  playersInAnalytic: one(players, {
    fields: [economyFlags.playerId],
    references: [players.id],
  }),
  roundsInAnalytic: one(rounds, {
    fields: [economyFlags.roundId],
    references: [rounds.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [economyFlags.teamId],
    references: [teams.id],
  }),
}))

export const killImpactInAnalyticsRelations = relations(killImpact, ({ one }) => ({
  killsInAnalytic: one(kills, {
    fields: [killImpact.killId],
    references: [kills.id],
  }),
  playersInAnalytic_killerId: one(players, {
    fields: [killImpact.killerId],
    references: [players.id],
    relationName: 'killImpactInAnalytics_killerId_playersInAnalytics_id',
  }),
  roundsInAnalytic: one(rounds, {
    fields: [killImpact.roundId],
    references: [rounds.id],
  }),
  playersInAnalytic_victimId: one(players, {
    fields: [killImpact.victimId],
    references: [players.id],
    relationName: 'killImpactInAnalytics_victimId_playersInAnalytics_id',
  }),
}))

export const strategiesInAnalyticsRelations = relations(strategies, ({ one, many }) => ({
  mapsInAnalytic: one(maps, {
    fields: [strategies.mapId],
    references: [maps.id],
  }),
  roundStrategy: many(roundStrategy),
}))

export const insightsInAnalyticsRelations = relations(insights, ({ one }) => ({
  mapsInAnalytic: one(maps, {
    fields: [insights.mapId],
    references: [maps.id],
  }),
}))

export const playerPatternsInAnalyticsRelations = relations(playerPatterns, ({ one }) => ({
  mapsInAnalytic: one(maps, {
    fields: [playerPatterns.mapId],
    references: [maps.id],
  }),
  playersInAnalytic: one(players, {
    fields: [playerPatterns.playerId],
    references: [players.id],
  }),
  zonesInAnalytic: one(zones, {
    fields: [playerPatterns.zoneId],
    references: [zones.id],
  }),
}))

export const killAssistsInAnalyticsRelations = relations(killAssists, ({ one }) => ({
  killsInAnalytic: one(kills, {
    fields: [killAssists.killId],
    references: [kills.id],
  }),
  playersInAnalytic: one(players, {
    fields: [killAssists.playerId],
    references: [players.id],
  }),
}))

export const mapSitesInAnalyticsRelations = relations(mapSites, ({ one }) => ({
  mapsInAnalytic: one(maps, {
    fields: [mapSites.mapId],
    references: [maps.id],
  }),
}))

export const roundStrategyInAnalyticsRelations = relations(roundStrategy, ({ one }) => ({
  roundsInAnalytic: one(rounds, {
    fields: [roundStrategy.roundId],
    references: [rounds.id],
  }),
  strategiesInAnalytic: one(strategies, {
    fields: [roundStrategy.strategyId],
    references: [strategies.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [roundStrategy.teamId],
    references: [teams.id],
  }),
}))

export const mapCalloutsInAnalyticsRelations = relations(mapCallouts, ({ one }) => ({
  mapsInAnalytic: one(maps, {
    fields: [mapCallouts.mapId],
    references: [maps.id],
  }),
}))

export const damageEventsInAnalyticsRelations = relations(damageEvents, ({ one }) => ({
  playersInAnalytic_dealerId: one(players, {
    fields: [damageEvents.dealerId],
    references: [players.id],
    relationName: 'damageEventsInAnalytics_dealerId_playersInAnalytics_id',
  }),
  playersInAnalytic_receiverId: one(players, {
    fields: [damageEvents.receiverId],
    references: [players.id],
    relationName: 'damageEventsInAnalytics_receiverId_playersInAnalytics_id',
  }),
  roundsInAnalytic: one(rounds, {
    fields: [damageEvents.roundId],
    references: [rounds.id],
  }),
}))

export const abilityKillsInAnalyticsRelations = relations(abilityKills, ({ one }) => ({
  agentsInAnalytic: one(agents, {
    fields: [abilityKills.agentId],
    references: [agents.id],
  }),
  matchesInAnalytic: one(matches, {
    fields: [abilityKills.matchId],
    references: [matches.id],
  }),
  playersInAnalytic: one(players, {
    fields: [abilityKills.playerId],
    references: [players.id],
  }),
}))

export const agentsInAnalyticsRelations = relations(agents, ({ many }) => ({
  abilityKills: many(abilityKills),
  agentMapStats: many(agentMapStats),
  heatmapZones: many(heatmapZones),
  combosInAnalytics_agentA: many(combos, {
    relationName: 'combosInAnalytics_agentA_agentsInAnalytics_id',
  }),
  combosInAnalytics_agentB: many(combos, {
    relationName: 'combosInAnalytics_agentB_agentsInAnalytics_id',
  }),
  matchPlayers: many(matchPlayers),
  heatmapCells: many(heatmapCells),
  abilityUsage: many(abilityUsage),
  weaponStats: many(weaponStats),
  playerMatchStats: many(playerMatchStats),
}))

export const roundWpStatesInAnalyticsRelations = relations(roundWpStates, ({ one }) => ({
  killsInAnalytic: one(kills, {
    fields: [roundWpStates.killId],
    references: [kills.id],
  }),
  roundsInAnalytic: one(rounds, {
    fields: [roundWpStates.roundId],
    references: [rounds.id],
  }),
}))

export const agentMapStatsInAnalyticsRelations = relations(agentMapStats, ({ one }) => ({
  agentsInAnalytic: one(agents, {
    fields: [agentMapStats.agentId],
    references: [agents.id],
  }),
  mapsInAnalytic: one(maps, {
    fields: [agentMapStats.mapId],
    references: [maps.id],
  }),
}))

export const positionSamplesInAnalyticsRelations = relations(positionSamples, ({ one }) => ({
  killsInAnalytic: one(kills, {
    fields: [positionSamples.killId],
    references: [kills.id],
  }),
  playersInAnalytic: one(players, {
    fields: [positionSamples.playerId],
    references: [players.id],
  }),
  zonesInAnalytic: one(zones, {
    fields: [positionSamples.zoneId],
    references: [zones.id],
  }),
}))

export const roundPlayerStatsInAnalyticsRelations = relations(roundPlayerStats, ({ one }) => ({
  playersInAnalytic: one(players, {
    fields: [roundPlayerStats.playerId],
    references: [players.id],
  }),
  roundsInAnalytic: one(rounds, {
    fields: [roundPlayerStats.roundId],
    references: [rounds.id],
  }),
}))

export const pressureStatsInAnalyticsRelations = relations(pressureStats, ({ one }) => ({
  mapsInAnalytic: one(maps, {
    fields: [pressureStats.mapId],
    references: [maps.id],
  }),
  playersInAnalytic: one(players, {
    fields: [pressureStats.playerId],
    references: [players.id],
  }),
  stagesInAnalytic: one(stages, {
    fields: [pressureStats.stageId],
    references: [stages.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [pressureStats.teamId],
    references: [teams.id],
  }),
}))

export const rotationsInAnalyticsRelations = relations(rotations, ({ one }) => ({
  mapsInAnalytic: one(maps, {
    fields: [rotations.mapId],
    references: [maps.id],
  }),
  playersInAnalytic: one(players, {
    fields: [rotations.playerId],
    references: [players.id],
  }),
  roundsInAnalytic: one(rounds, {
    fields: [rotations.roundId],
    references: [rounds.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [rotations.teamId],
    references: [teams.id],
  }),
}))

export const heatmapZonesInAnalyticsRelations = relations(heatmapZones, ({ one }) => ({
  agentsInAnalytic: one(agents, {
    fields: [heatmapZones.agentId],
    references: [agents.id],
  }),
  mapsInAnalytic: one(maps, {
    fields: [heatmapZones.mapId],
    references: [maps.id],
  }),
  playersInAnalytic: one(players, {
    fields: [heatmapZones.playerId],
    references: [players.id],
  }),
  stagesInAnalytic: one(stages, {
    fields: [heatmapZones.stageId],
    references: [stages.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [heatmapZones.teamId],
    references: [teams.id],
  }),
  zonesInAnalytic: one(zones, {
    fields: [heatmapZones.zoneId],
    references: [zones.id],
  }),
}))

export const combosInAnalyticsRelations = relations(combos, ({ one }) => ({
  agentsInAnalytic_agentA: one(agents, {
    fields: [combos.agentA],
    references: [agents.id],
    relationName: 'combosInAnalytics_agentA_agentsInAnalytics_id',
  }),
  agentsInAnalytic_agentB: one(agents, {
    fields: [combos.agentB],
    references: [agents.id],
    relationName: 'combosInAnalytics_agentB_agentsInAnalytics_id',
  }),
  mapsInAnalytic: one(maps, {
    fields: [combos.mapId],
    references: [maps.id],
  }),
  playersInAnalytic_playerA: one(players, {
    fields: [combos.playerA],
    references: [players.id],
    relationName: 'combosInAnalytics_playerA_playersInAnalytics_id',
  }),
  playersInAnalytic_playerB: one(players, {
    fields: [combos.playerB],
    references: [players.id],
    relationName: 'combosInAnalytics_playerB_playersInAnalytics_id',
  }),
  stagesInAnalytic: one(stages, {
    fields: [combos.stageId],
    references: [stages.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [combos.teamId],
    references: [teams.id],
  }),
}))

export const matchPlayersInAnalyticsRelations = relations(matchPlayers, ({ one }) => ({
  agentsInAnalytic: one(agents, {
    fields: [matchPlayers.agentId],
    references: [agents.id],
  }),
  matchesInAnalytic: one(matches, {
    fields: [matchPlayers.matchId],
    references: [matches.id],
  }),
  playersInAnalytic: one(players, {
    fields: [matchPlayers.playerId],
    references: [players.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [matchPlayers.teamId],
    references: [teams.id],
  }),
}))

export const heatmapCellsInAnalyticsRelations = relations(heatmapCells, ({ one }) => ({
  agentsInAnalytic: one(agents, {
    fields: [heatmapCells.agentId],
    references: [agents.id],
  }),
  mapsInAnalytic: one(maps, {
    fields: [heatmapCells.mapId],
    references: [maps.id],
  }),
  playersInAnalytic: one(players, {
    fields: [heatmapCells.playerId],
    references: [players.id],
  }),
  stagesInAnalytic: one(stages, {
    fields: [heatmapCells.stageId],
    references: [stages.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [heatmapCells.teamId],
    references: [teams.id],
  }),
}))

export const roundTeamEconomyInAnalyticsRelations = relations(roundTeamEconomy, ({ one }) => ({
  mapsInAnalytic: one(maps, {
    fields: [roundTeamEconomy.mapId],
    references: [maps.id],
  }),
  matchesInAnalytic: one(matches, {
    fields: [roundTeamEconomy.matchId],
    references: [matches.id],
  }),
  roundsInAnalytic: one(rounds, {
    fields: [roundTeamEconomy.roundId],
    references: [rounds.id],
  }),
  stagesInAnalytic: one(stages, {
    fields: [roundTeamEconomy.stageId],
    references: [stages.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [roundTeamEconomy.teamId],
    references: [teams.id],
  }),
}))

export const roundPlayersInAnalyticsRelations = relations(roundPlayers, ({ one }) => ({
  weaponsInAnalytic_armorId: one(weapons, {
    fields: [roundPlayers.armorId],
    references: [weapons.id],
    relationName: 'roundPlayersInAnalytics_armorId_weaponsInAnalytics_id',
  }),
  playersInAnalytic: one(players, {
    fields: [roundPlayers.playerId],
    references: [players.id],
  }),
  roundsInAnalytic: one(rounds, {
    fields: [roundPlayers.roundId],
    references: [rounds.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [roundPlayers.teamId],
    references: [teams.id],
  }),
  weaponsInAnalytic_weaponId: one(weapons, {
    fields: [roundPlayers.weaponId],
    references: [weapons.id],
    relationName: 'roundPlayersInAnalytics_weaponId_weaponsInAnalytics_id',
  }),
}))

export const abilityUsageInAnalyticsRelations = relations(abilityUsage, ({ one }) => ({
  agentsInAnalytic: one(agents, {
    fields: [abilityUsage.agentId],
    references: [agents.id],
  }),
  mapsInAnalytic: one(maps, {
    fields: [abilityUsage.mapId],
    references: [maps.id],
  }),
  matchesInAnalytic: one(matches, {
    fields: [abilityUsage.matchId],
    references: [matches.id],
  }),
  playersInAnalytic: one(players, {
    fields: [abilityUsage.playerId],
    references: [players.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [abilityUsage.teamId],
    references: [teams.id],
  }),
}))

export const weaponStatsInAnalyticsRelations = relations(weaponStats, ({ one }) => ({
  agentsInAnalytic: one(agents, {
    fields: [weaponStats.agentId],
    references: [agents.id],
  }),
  mapsInAnalytic: one(maps, {
    fields: [weaponStats.mapId],
    references: [maps.id],
  }),
  matchesInAnalytic: one(matches, {
    fields: [weaponStats.matchId],
    references: [matches.id],
  }),
  playersInAnalytic: one(players, {
    fields: [weaponStats.playerId],
    references: [players.id],
  }),
  stagesInAnalytic: one(stages, {
    fields: [weaponStats.stageId],
    references: [stages.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [weaponStats.teamId],
    references: [teams.id],
  }),
  weaponsInAnalytic: one(weapons, {
    fields: [weaponStats.weaponId],
    references: [weapons.id],
  }),
}))

export const playerMatchStatsInAnalyticsRelations = relations(playerMatchStats, ({ one }) => ({
  agentsInAnalytic: one(agents, {
    fields: [playerMatchStats.agentId],
    references: [agents.id],
  }),
  mapsInAnalytic: one(maps, {
    fields: [playerMatchStats.mapId],
    references: [maps.id],
  }),
  matchesInAnalytic: one(matches, {
    fields: [playerMatchStats.matchId],
    references: [matches.id],
  }),
  playersInAnalytic: one(players, {
    fields: [playerMatchStats.playerId],
    references: [players.id],
  }),
  stagesInAnalytic: one(stages, {
    fields: [playerMatchStats.stageId],
    references: [stages.id],
  }),
  teamsInAnalytic: one(teams, {
    fields: [playerMatchStats.teamId],
    references: [teams.id],
  }),
}))
