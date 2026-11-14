// Resumo de um campeonato encerrado (usado na imagem PNG exportável). Puro, sem React nem DOM.
import { compareStats, computePlayerStats, computeScorers } from './tournament.js'

// Até onde cada jogador chegou (o jogo do pato não conta como avanço)
const STAGE_RANK = { group: 1, second: 2, repescagem: 3, quarter: 4, semi: 5, final: 6 }
const STAGE_REACHED = {
  group: 'Fase de grupos',
  second: 'Mata-mata',
  repescagem: 'Repescagem',
  quarter: 'Quartas',
  semi: 'Semifinal',
  final: 'Final',
}

const goals = (m) => m.result.hg + m.result.ag

export function computeSummary(state, t) {
  const players = state.players
  const pById = Object.fromEntries(players.map((p) => [p.id, p]))
  const played = t.matches.filter((m) => m.result)
  const stats = computePlayerStats(t, players)
  const scorers = computeScorers(t, players)
  const totalGoals = played.reduce((n, m) => n + goals(m), 0)

  const reached = {}
  for (const m of played) {
    const rank = STAGE_RANK[m.stage]
    if (!rank) continue
    for (const id of [m.homeId, m.awayId]) if (!reached[id] || reached[id] < rank) reached[id] = rank
  }
  const stageKey = (id) => Object.keys(STAGE_RANK).find((k) => STAGE_RANK[k] === (reached[id] || 1))

  const tag = (id) => {
    if (id === t.champion) return { icon: '🏆', label: 'Campeão', tone: 'gold' }
    if (id === t.vice) return { icon: '🥈', label: 'Vice', tone: 'silver' }
    if (id === t.pato) return { icon: '🦆', label: 'Pato', tone: 'pato' }
    return { icon: '', label: STAGE_REACHED[stageKey(id)], tone: 'neutral' }
  }
  const order = (id) => (id === t.champion ? 100 : id === t.vice ? 99 : id === t.pato ? -1 : reached[id] || 1)
  const standings = players
    .map((p) => ({ ...stats.get(p.id), player: p, tag: tag(p.id) }))
    .sort((a, b) => order(b.playerId) - order(a.playerId) || compareStats(a, b) || a.player.name.localeCompare(b.player.name))

  const withGames = [...stats.values()].filter((r) => r.j)
  const attack = withGames.slice().sort((a, b) => b.gp / b.j - a.gp / a.j || b.gp - a.gp)[0] || null
  const defense = withGames.slice().sort((a, b) => a.gc / a.j - b.gc / b.j || a.gc - b.gc)[0] || null

  const margin = (m) => Math.abs(m.result.hg - m.result.ag)
  const biggestWin = played
    .filter((m) => margin(m) > 0)
    .sort((a, b) => margin(b) - margin(a) || goals(b) - goals(a))[0] || null
  const mostGoals = played.slice().sort((a, b) => goals(b) - goals(a) || margin(b) - margin(a))[0] || null

  const topGoals = scorers[0]?.goals || 0
  const topScorers = topGoals ? scorers.filter((s) => s.goals === topGoals) : []

  return {
    name: state.name || 'Campeonato PES',
    players: pById,
    champion: pById[t.champion] || null,
    vice: pById[t.vice] || null,
    pato: pById[t.pato] || null,
    championStats: stats.get(t.champion) || null,
    final: t.matches.find((m) => m.id === 'F') || null,
    patoMatch: t.matches.find((m) => m.id === 'PATO') || null,
    totalMatches: played.length,
    totalGoals,
    avgGoals: played.length ? totalGoals / played.length : 0,
    scorers: scorers.slice(0, 5),
    topScorers,
    attack,
    defense,
    biggestWin,
    mostGoals: mostGoals && goals(mostGoals) > 0 ? mostGoals : null,
    standings,
    endedAt: played.reduce((n, m) => Math.max(n, m.result.playedAt || 0), 0) || null,
  }
}
