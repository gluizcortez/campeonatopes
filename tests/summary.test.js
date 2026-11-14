// Resumo do campeonato encerrado (imagem PNG): dados coerentes em todos os formatos
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGroupMatches, computeTournament, FORMATS, GROUP_IDS } from '../src/logic/tournament.js'
import { computeSummary } from '../src/logic/summary.js'

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32) }

export function playFull(format, seed = 1) {
  const rand = rng(seed)
  const f = FORMATS[format]
  const players = Array.from({ length: format }, (_, i) => ({ id: `p${i}`, name: `J${i}`, team: `t${i}` }))
  const ids = players.map((p) => p.id)
  const cafe = f.cafe ? ids.pop() : null
  const groups = GROUP_IDS.slice(0, f.groups).map((id, i) => ({ id, playerIds: cafe && i < 2 ? [cafe] : [] }))
  for (const id of ids) groups.find((g) => g.playerIds.length < f.perGroup).playerIds.push(id)
  const st = { name: 'Teste', format, players, groups, cafe, groupMatches: buildGroupMatches(groups, null, cafe), results: {}, overrides: {} }
  for (let i = 0; i < 200; i++) {
    const t = computeTournament(st)
    if (t.finished) return { st, t }
    const m = t.ready[0]
    const hg = Math.floor(rand() * 5), ag = Math.floor(rand() * 4)
    const scorers = [...Array(hg)].map(() => ({ side: 'home', name: rand() < 0.5 ? 'Kane' : 'Mbappé' }))
    st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg, ag, ph: m.knockout && hg === ag ? 5 : null, pa: m.knockout && hg === ag ? 4 : null, scorers, playedAt: i }
  }
  throw new Error('não terminou')
}

for (const format of Object.keys(FORMATS).map(Number)) {
  test(`resumo formato ${format}`, () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { st, t } = playFull(format, seed)
      const s = computeSummary(st, t)
      assert.equal(s.champion.id, t.champion)
      assert.equal(s.vice.id, t.vice)
      assert.equal(s.pato.id, t.pato)
      assert.equal(s.standings.length, format)
      assert.equal(s.standings[0].playerId, t.champion)
      assert.equal(s.standings[1].playerId, t.vice)
      assert.equal(s.standings.at(-1).playerId, t.pato)
      assert.equal(s.totalMatches, t.totalMatches)
      const goals = t.matches.reduce((n, m) => n + m.result.hg + m.result.ag, 0)
      assert.equal(s.totalGoals, goals)
      assert.ok(s.final.result)
      // semifinalistas eliminados aparecem logo depois do vice
      assert.equal(s.standings[2].tag.label, 'Semifinal')
      if (s.biggestWin) {
        const mg = Math.max(...t.matches.map((m) => Math.abs(m.result.hg - m.result.ag)))
        assert.equal(Math.abs(s.biggestWin.result.hg - s.biggestWin.result.ag), mg)
      }
    }
  })
}
