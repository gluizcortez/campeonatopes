// Regras e cálculo do campeonato. Tudo aqui é puro (sem React), para ficar fácil de testar.

export const GROUP_IDS = ['A', 'B', 'C']

export const FORMATS = {
  9: {
    size: 9,
    groups: 3,
    perGroup: 3,
    title: '9 participantes',
    summary: '3 grupos de 3 · passam 2 por grupo',
    steps: [
      'Fase de grupos: 3 grupos de 3, todos contra todos. Passam os 2 melhores.',
      'Mata-mata: 3 jogos (1º A × 2º B, 1º B × 2º C, 1º C × 2º A).',
      'Repescagem: os 3 derrotados jogam um triangular. Passa o líder.',
      'Semifinais: os 3 vencedores + o líder da repescagem.',
      'Final em jogo único 🏆',
    ],
  },
  10: {
    size: 10,
    groups: 2,
    perGroup: 5,
    title: '10 participantes',
    summary: '2 grupos de 5 · 2 jogos cada · passam 3',
    steps: [
      'Fase de grupos: 2 grupos de 5. Cada um joga contra 2 adversários do grupo (confrontos definidos antes).',
      'Passam os 3 melhores de cada grupo.',
      'Mata-mata: 3 jogos (1º A × 3º B, 1º B × 3º A, 2º A × 2º B).',
      'Repescagem: os 3 derrotados jogam um triangular. Passa o líder.',
      'Semifinais: os 3 vencedores + o líder da repescagem.',
      'Final em jogo único 🏆',
    ],
  },
  12: {
    size: 12,
    groups: 3,
    perGroup: 4,
    title: '12 participantes',
    summary: '3 grupos de 4 · quartas de final',
    steps: [
      'Fase de grupos: 3 grupos de 4, todos contra todos.',
      'Passam os 2 primeiros de cada grupo + os 2 melhores 3º colocados.',
      'Quartas de final: 1º × 8º, 4º × 5º, 2º × 7º, 3º × 6º (pela campanha).',
      'Semifinais e final em jogo único 🏆',
    ],
  },
}

export const STAGES = {
  group: 'Fase de grupos',
  second: 'Mata-mata',
  quarter: 'Quartas de final',
  repescagem: 'Repescagem',
  semi: 'Semifinal',
  pato: 'Disputa do Pato',
  final: 'Final',
}

// Confrontos de um grupo, em ordem de jogo, usando índices das posições no grupo.
export function defaultGroupPairs(size) {
  if (size === 3) return [[0, 1], [2, 0], [1, 2]]
  if (size === 4) return [[0, 3], [1, 2], [0, 2], [3, 1], [0, 1], [2, 3]]
  // 5 jogadores, 2 jogos cada (ciclo): 1×2, 3×4, 5×1, 2×3, 4×5
  if (size === 5) return [[0, 1], [2, 3], [4, 0], [1, 2], [3, 4]]
  return []
}

export function defaultGroupMatchups(playerIds) {
  return defaultGroupPairs(playerIds.length).map(([h, a]) => [playerIds[h], playerIds[a]])
}

// Cria a lista de jogos da fase de grupos, intercalando os grupos para dar descanso.
export function buildGroupMatches(groups, matchups) {
  const perGroup = groups.map((g) => (matchups?.[g.id] || defaultGroupMatchups(g.playerIds)))
  const max = Math.max(0, ...perGroup.map((m) => m.length))
  const size = groups[0]?.playerIds.length || 0
  const perRound = size === 3 ? 1 : 2
  const out = []
  for (let i = 0; i < max; i++) {
    groups.forEach((g, gi) => {
      const pair = perGroup[gi][i]
      if (!pair) return
      out.push({
        id: `G${g.id}${i + 1}`,
        groupId: g.id,
        round: Math.floor(i / perRound) + 1,
        homeId: pair[0],
        awayId: pair[1],
      })
    })
  }
  return out
}

export function validResult(match, results) {
  const r = results?.[match.id]
  if (!r || !match.homeId || !match.awayId) return null
  if (r.homeId !== match.homeId || r.awayId !== match.awayId) return null
  return r
}

export function winnerOf(match, r) {
  if (!r) return null
  if (r.hg > r.ag) return { winner: match.homeId, loser: match.awayId }
  if (r.ag > r.hg) return { winner: match.awayId, loser: match.homeId }
  if (r.ph != null && r.pa != null) {
    if (r.ph > r.pa) return { winner: match.homeId, loser: match.awayId }
    if (r.pa > r.ph) return { winner: match.awayId, loser: match.homeId }
  }
  return null
}

function emptyRow(playerId) {
  return { playerId, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0, form: [] }
}

function applyResult(row, gf, ga) {
  row.j++
  row.gp += gf
  row.gc += ga
  row.sg = row.gp - row.gc
  if (gf > ga) { row.v++; row.pts += 3; row.form.push('V') }
  else if (gf === ga) { row.e++; row.pts += 1; row.form.push('E') }
  else { row.d++; row.form.push('D') }
}

// Critério: pontos, vitórias, saldo de gols, gols pró.
export function compareStats(a, b) {
  return b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gp - a.gp
}

export function computeTable(playerIds, matches, results, tiebreak) {
  const rows = new Map(playerIds.map((id) => [id, emptyRow(id)]))
  for (const m of matches) {
    const r = validResult(m, results)
    if (!r) continue
    const h = rows.get(m.homeId)
    const a = rows.get(m.awayId)
    if (h) applyResult(h, r.hg, r.ag)
    if (a) applyResult(a, r.ag, r.hg)
  }
  const list = [...rows.values()]
  list.sort((a, b) => compareStats(a, b) || (tiebreak ? tiebreak(a.playerId, b.playerId) : 0))
  return list
}

// Monta todo o estado derivado do campeonato a partir do que está salvo.
export function computeTournament(state) {
  const { format, groups = [], results = {}, overrides = {}, players = [] } = state
  const nameOf = (id) => players.find((p) => p.id === id)?.name || ''
  const byName = (a, b) => nameOf(a).localeCompare(nameOf(b))

  const matches = []
  const outcomes = {}

  // ---------- Fase de grupos ----------
  for (const gm of state.groupMatches || []) {
    const result = validResult(gm, results)
    matches.push({
      ...gm,
      stage: 'group',
      title: `Grupo ${gm.groupId}`,
      subtitle: `Rodada ${gm.round}`,
      knockout: false,
      result,
    })
  }
  const groupMatches = matches.slice()
  const groupTables = {}
  for (const g of groups) {
    const gms = groupMatches.filter((m) => m.groupId === g.id)
    groupTables[g.id] = computeTable(g.playerIds, gms, results, byName)
  }
  const phase1Done = groupMatches.length > 0 && groupMatches.every((m) => m.result)

  // Posição de cada jogador no grupo
  const groupPos = {}
  const statsOf = {}
  for (const g of groups) {
    groupTables[g.id].forEach((row, i) => {
      groupPos[row.playerId] = { group: g.id, pos: i + 1 }
      statsOf[row.playerId] = row
    })
  }

  const cmpOverall = (a, b) =>
    groupPos[a].pos - groupPos[b].pos || compareStats(statsOf[a], statsOf[b]) || byName(a, b)

  // ---------- Classificados ----------
  let qualified = []
  let thirdsRanking = []
  if (groups.length) {
    const top = (gid, n) => groupTables[gid].slice(0, n).map((r) => r.playerId)
    if (format === 9) qualified = groups.flatMap((g) => top(g.id, 2))
    if (format === 10) qualified = groups.flatMap((g) => top(g.id, 3))
    if (format === 12) {
      const thirds = groups.map((g) => groupTables[g.id][2]?.playerId).filter(Boolean)
      thirdsRanking = thirds.slice().sort(cmpOverall)
      qualified = [...groups.flatMap((g) => top(g.id, 2)), ...thirdsRanking.slice(0, 2)]
    }
  }
  const qualifiedSet = new Set(qualified)
  const overallSeeds = qualified.slice().sort(cmpOverall)
  const seedRank = Object.fromEntries(overallSeeds.map((id, i) => [id, i + 1]))

  const eliminated = groups
    .flatMap((g) => g.playerIds)
    .filter((id) => !qualifiedSet.has(id))
    .sort((a, b) => compareStats(statsOf[a], statsOf[b]) || groupPos[a].pos - groupPos[b].pos || byName(a, b))

  const pos = (gid, n) => (phase1Done ? groupTables[gid]?.[n - 1]?.playerId || null : null)

  // ---------- Helper para jogos eliminatórios ----------
  function ko({ id, stage, title, subtitle, home, away, homeLabel, awayLabel }) {
    const ov = overrides[id]
    const homeId = ov?.homeId ?? (typeof home === 'function' ? home() : home) ?? null
    const awayId = ov?.awayId ?? (typeof away === 'function' ? away() : away) ?? null
    const m = {
      id, stage, title, subtitle, knockout: true, homeId, awayId, homeLabel, awayLabel,
      overridden: !!ov,
    }
    m.result = validResult(m, results)
    m.staleResult = !!results[id] && !m.result
    outcomes[id] = winnerOf(m, m.result)
    matches.push(m)
    return m
  }
  const W = (id) => () => outcomes[id]?.winner ?? null
  const L = (id) => () => outcomes[id]?.loser ?? null

  let repescagem = null
  if (format === 9 || format === 10) {
    const pairs = format === 9
      ? [[['A', 1], ['B', 2]], [['B', 1], ['C', 2]], [['C', 1], ['A', 2]]]
      : [[['A', 1], ['B', 3]], [['B', 1], ['A', 3]], [['A', 2], ['B', 2]]]
    pairs.forEach(([[hg, hp], [ag, ap]], i) => {
      ko({
        id: `K${i + 1}`, stage: 'second', title: 'Mata-mata', subtitle: `Jogo ${i + 1}`,
        home: pos(hg, hp), away: pos(ag, ap),
        homeLabel: `${hp}º Grupo ${hg}`, awayLabel: `${ap}º Grupo ${ag}`,
      })
    })
    const rp = [[1, 2], [3, 1], [2, 3]]
    const rpMatches = rp.map(([h, a], i) =>
      ko({
        id: `R${i + 1}`, stage: 'repescagem', title: 'Repescagem', subtitle: `Triangular · Jogo ${i + 1}`,
        home: L(`K${h}`), away: L(`K${a}`),
        homeLabel: `Perdedor Jogo ${h}`, awayLabel: `Perdedor Jogo ${a}`,
      }),
    )
    const rpPlayers = [...new Set(rpMatches.flatMap((m) => [m.homeId, m.awayId]).filter(Boolean))]
    const rpTable = computeTable(rpPlayers, rpMatches, results, (a, b) => (seedRank[a] || 99) - (seedRank[b] || 99))
    const rpDone = rpMatches.every((m) => m.result)
    repescagem = { table: rpTable, done: rpDone, winner: rpDone ? rpTable[0]?.playerId : null }

    const winnersK = () => {
      const w = ['K1', 'K2', 'K3'].map((id) => outcomes[id]?.winner)
      if (w.some((x) => !x)) return null
      return w.sort((a, b) => (seedRank[a] || 99) - (seedRank[b] || 99))
    }
    ko({
      id: 'S1', stage: 'semi', title: 'Semifinal', subtitle: 'Semi 1',
      home: () => winnersK()?.[0] ?? null, away: () => repescagem.winner,
      homeLabel: '1º melhor vencedor', awayLabel: 'Líder da repescagem',
    })
    ko({
      id: 'S2', stage: 'semi', title: 'Semifinal', subtitle: 'Semi 2',
      home: () => winnersK()?.[1] ?? null, away: () => winnersK()?.[2] ?? null,
      homeLabel: '2º melhor vencedor', awayLabel: '3º melhor vencedor',
    })
  }

  if (format === 12) {
    let qf = null
    if (phase1Done && overallSeeds.length === 8) {
      const s = overallSeeds
      qf = [[s[0], s[7]], [s[3], s[4]], [s[1], s[6]], [s[2], s[5]]]
      // Evita confronto de jogadores do mesmo grupo nas quartas, trocando adversários quando possível
      const same = (p) => groupPos[p[0]].group === groupPos[p[1]].group
      for (let i = 0; i < qf.length; i++) {
        if (!same(qf[i])) continue
        for (let j = qf.length - 1; j >= 0; j--) {
          if (j === i) continue
          const a = [qf[i][0], qf[j][1]]
          const b = [qf[j][0], qf[i][1]]
          if (!same(a) && !same(b)) { const t = qf[i][1]; qf[i][1] = qf[j][1]; qf[j][1] = t; break }
        }
      }
    }
    const labels = [['1º geral', '8º geral'], ['4º geral', '5º geral'], ['2º geral', '7º geral'], ['3º geral', '6º geral']]
    for (let i = 0; i < 4; i++) {
      ko({
        id: `Q${i + 1}`, stage: 'quarter', title: 'Quartas de final', subtitle: `Jogo ${i + 1}`,
        home: qf?.[i][0] ?? null, away: qf?.[i][1] ?? null,
        homeLabel: labels[i][0], awayLabel: labels[i][1],
      })
    }
    ko({
      id: 'S1', stage: 'semi', title: 'Semifinal', subtitle: 'Semi 1',
      home: W('Q1'), away: W('Q2'), homeLabel: 'Vencedor QF 1', awayLabel: 'Vencedor QF 2',
    })
    ko({
      id: 'S2', stage: 'semi', title: 'Semifinal', subtitle: 'Semi 2',
      home: W('Q3'), away: W('Q4'), homeLabel: 'Vencedor QF 3', awayLabel: 'Vencedor QF 4',
    })
  }

  const n = eliminated.length
  ko({
    id: 'PATO', stage: 'pato', title: 'Disputa do Pato', subtitle: 'Perdedor leva o pato',
    home: phase1Done && n >= 2 ? eliminated[n - 2] : null,
    away: phase1Done && n >= 2 ? eliminated[n - 1] : null,
    homeLabel: 'Penúltimo geral', awayLabel: 'Último geral',
  })
  ko({
    id: 'F', stage: 'final', title: 'Final', subtitle: 'Valendo a taça 🏆',
    home: W('S1'), away: W('S2'), homeLabel: 'Vencedor Semi 1', awayLabel: 'Vencedor Semi 2',
  })

  const champion = outcomes.F?.winner || null
  const vice = outcomes.F?.loser || null
  const pato = outcomes.PATO?.loser || null

  // Partida atual / próximas
  const ready = matches.filter((m) => !m.result && m.homeId && m.awayId)
  const live = state.liveMatchId ? ready.find((m) => m.id === state.liveMatchId) : null
  const current = live || ready[0] || null
  const upcoming = ready.filter((m) => m !== current)
  const played = matches.filter((m) => m.result)
  const recent = played
    .slice()
    .sort((a, b) => (b.result.playedAt || 0) - (a.result.playedAt || 0))

  return {
    matches,
    groupTables,
    groupPos,
    phase1Done,
    qualified: qualifiedSet,
    thirdsRanking,
    overallSeeds,
    eliminated,
    repescagem,
    outcomes,
    champion,
    vice,
    pato,
    current,
    upcoming,
    recent,
    totalMatches: matches.length,
    playedCount: played.length,
    finished: !!champion && !!pato,
  }
}

// ---------- Artilharia ----------
export function normalizeName(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function computeScorers(t, players) {
  const pById = Object.fromEntries(players.map((p) => [p.id, p]))
  const map = new Map()
  for (const m of t.matches) {
    if (!m.result) continue
    for (const g of m.result.scorers || []) {
      if (!g.name?.trim() || g.ownGoal) continue
      const ownerId = g.side === 'home' ? m.homeId : m.awayId
      const owner = pById[ownerId]
      if (!owner) continue
      const key = `${owner.team}|${normalizeName(g.name)}`
      const cur = map.get(key) || { key, name: g.name.trim(), team: owner.team, playerId: owner.id, goals: 0, matches: new Set() }
      cur.goals++
      cur.matches.add(m.id)
      map.set(key, cur)
    }
  }
  return [...map.values()]
    .map((s) => ({ ...s, matches: s.matches.size }))
    .sort((a, b) => b.goals - a.goals || a.matches - b.matches || a.name.localeCompare(b.name))
}

// Estatísticas gerais de cada participante em todo o campeonato
export function computePlayerStats(t, players) {
  const rows = new Map(players.map((p) => [p.id, emptyRow(p.id)]))
  for (const m of t.matches) {
    if (!m.result) continue
    const h = rows.get(m.homeId)
    const a = rows.get(m.awayId)
    if (h) applyResult(h, m.result.hg, m.result.ag)
    if (a) applyResult(a, m.result.ag, m.result.hg)
  }
  return rows
}

export function playerStatus(t, id) {
  if (t.champion === id) return { label: 'Campeão', tone: 'gold' }
  if (t.vice === id) return { label: 'Vice', tone: 'silver' }
  if (t.pato === id) return { label: 'Pato', tone: 'pato' }
  if (!t.phase1Done) return { label: 'Fase de grupos', tone: 'neutral' }
  if (!t.qualified.has(id)) {
    const p = t.matches.find((m) => m.id === 'PATO')
    if (p && (p.homeId === id || p.awayId === id) && !p.result) return { label: 'Briga pelo pato', tone: 'pato' }
    return { label: 'Eliminado', tone: 'out' }
  }
  // Ainda vivo?
  const lostKO = t.matches.some((m) => m.knockout && m.stage !== 'pato' && m.stage !== 'second' && t.outcomes[m.id]?.loser === id)
  const repLost = t.repescagem?.done && t.repescagem.winner !== id && t.repescagem.table.some((r) => r.playerId === id)
  if (lostKO || repLost) return { label: 'Eliminado', tone: 'out' }
  const lostSecond = t.matches.some((m) => m.stage === 'second' && t.outcomes[m.id]?.loser === id)
  if (lostSecond && t.repescagem?.winner !== id) return { label: 'Repescagem', tone: 'warn' }
  return { label: 'Vivo', tone: 'alive' }
}
