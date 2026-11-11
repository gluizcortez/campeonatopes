// Estresse: joga, edita resultados antigos aleatoriamente, apaga, e continua até o fim.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGroupMatches, computeTournament, FORMATS, GROUP_IDS } from '../src/logic/tournament.js'

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32) }

function setup(format, rand) {
  const f = FORMATS[format]
  const players = Array.from({ length: format }, (_, i) => ({ id: `p${i}`, name: `J${i}`, team: `t${i}` }))
  const ids = players.map((p) => p.id).sort(() => rand() - 0.5)
  const cafe = f.cafe ? ids.pop() : null
  const groups = GROUP_IDS.slice(0, f.groups).map((id, i) => ({ id, playerIds: cafe && i < 2 ? [cafe] : [] }))
  for (const id of ids) groups.find((g) => g.playerIds.length < f.perGroup).playerIds.push(id)
  return { format, players, groups, cafe, groupMatches: buildGroupMatches(groups, null, cafe), results: {}, overrides: {} }
}

function invariants(t) {
  const byStage = {}
  for (const m of t.matches) {
    if (m.homeId && m.awayId) assert.notEqual(m.homeId, m.awayId, `${m.id} contra si mesmo`)
    if (!m.knockout || m.stage === 'repescagem') continue
    for (const id of [m.homeId, m.awayId]) {
      if (!id) continue
      const k = `${m.stage}|${id}`
      assert.ok(!byStage[k], `${id} em dois jogos da fase ${m.stage}`)
      byStage[k] = true
    }
    if (m.result) assert.equal(m.result.homeId, m.homeId)
  }
  // ninguém classificado disputa o pato
  const pato = t.matches.find((m) => m.id === 'PATO')
  for (const id of [pato.homeId, pato.awayId]) if (id) assert.ok(!t.qualified.has(id))
  assert.equal(t.playedCount + t.matches.filter((m) => !m.result).length, t.totalMatches)
}

for (const format of [7, 8, 9, 10, 11, 12]) {
  test(`estresse formato ${format}: 80 campeonatos com edições no meio`, () => {
    for (let seed = 1; seed <= 80; seed++) {
      const rand = rng(seed * 104729 + format)
      const st = setup(format, rand)
      let finished = false
      for (let step = 0; step < 400; step++) {
        const t = computeTournament(st)
        invariants(t)
        if (t.finished) { finished = true; break }
        const r = rand()
        const played = Object.keys(st.results)
        if (r < 0.12 && played.length) {
          // edita um resultado antigo qualquer
          const id = played[Math.floor(rand() * played.length)]
          const old = st.results[id]
          const hg = Math.floor(rand() * 5), ag = Math.floor(rand() * 5)
          st.results[id] = { ...old, hg, ag, ph: hg === ag ? 3 : null, pa: hg === ag ? (rand() < 0.5 ? 2 : 4) : null }
        } else if (r < 0.17 && played.length) {
          delete st.results[played[Math.floor(rand() * played.length)]]
        } else {
          const m = t.ready[Math.floor(rand() * t.ready.length)]
          assert.ok(m, 'sempre existe partida liberada enquanto não terminou')
          const hg = Math.floor(rand() * 4), ag = Math.floor(rand() * 4)
          st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg, ag, ph: m.knockout && hg === ag ? 5 : null, pa: m.knockout && hg === ag ? 4 : null, scorers: [] }
        }
      }
      assert.ok(finished, `[seed ${seed}] não terminou`)
    }
  })
}
