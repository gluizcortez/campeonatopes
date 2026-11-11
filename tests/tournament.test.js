import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGroupMatches, computeTournament, computeScorers, FORMATS, GROUP_IDS } from '../src/logic/tournament.js'

function setup(format) {
  const f = FORMATS[format]
  const players = Array.from({ length: format }, (_, i) => ({ id: `p${i}`, name: `Jogador ${i}`, team: `t${i}` }))
  const cafe = f.cafe ? players[players.length - 1].id : null
  const real = players.filter((p) => p.id !== cafe)
  const groups = GROUP_IDS.slice(0, f.groups).map((id) => ({ id, playerIds: cafe && id !== 'C' ? [cafe] : [] }))
  for (const p of real) groups.find((g) => g.playerIds.length < f.perGroup).playerIds.push(p.id)
  return { format, players, groups, cafe, groupMatches: buildGroupMatches(groups, null, cafe), results: {}, overrides: {} }
}

function playAll(state, seed = 1) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let guard = 0; guard < 100; guard++) {
    const t = computeTournament(state)
    if (!t.current) return t
    const m = t.current
    const hg = Math.floor(rnd() * 4), ag = Math.floor(rnd() * 4)
    const r = { homeId: m.homeId, awayId: m.awayId, hg, ag, playedAt: guard, scorers: [{ side: 'home', name: 'Fulano' }] }
    if (m.knockout && hg === ag) { r.ph = 5; r.pa = 4 }
    state.results[m.id] = r
  }
  throw new Error('loop')
}

for (const format of [7, 8, 9, 10, 11, 12]) {
  test(`formato ${format} roda até o fim`, () => {
    for (let seed = 1; seed < 30; seed++) {
      const st = setup(format)
      const t = playAll(st, seed)
      assert.ok(t.champion, 'tem campeão')
      assert.ok(t.pato, 'tem pato')
      assert.equal(t.playedCount, t.totalMatches)
      assert.ok(!t.qualified.has(t.pato))
      if (st.cafe) {
        const n = st.groupMatches.filter((m) => m.homeId === st.cafe || m.awayId === st.cafe).length
        assert.equal(n, 6, 'café joga 6')
        for (const p of st.players.filter((p) => p.id !== st.cafe)) {
          assert.equal(st.groupMatches.filter((m) => m.homeId === p.id || m.awayId === p.id).length, 3)
        }
        assert.equal(t.qualified.size, format === 7 ? 4 : 8)
        assert.equal(t.eliminated.length, 3)
        // café só aparece na tabela de classificação de um grupo
        const inReal = Object.values(t.realTables).filter((rows) => rows.some((r) => r.playerId === st.cafe)).length
        assert.equal(inReal, 1)
      }
      // cada jogador do grupo de 10 joga 2 jogos
      if (format === 10) {
        for (const p of st.players) {
          const n = st.groupMatches.filter((m) => m.homeId === p.id || m.awayId === p.id).length
          assert.equal(n, 2)
        }
      }
      if (format === 12 || format === 11) {
        for (const id of ['Q1','Q2','Q3','Q4']) {
          const m = t.matches.find((x) => x.id === id)
          assert.notEqual(t.groupPos[m.homeId].group, t.groupPos[m.awayId].group, `${id} mesmo grupo`)
        }
      }
      assert.ok(computeScorers(t, st.players).length > 0)
    }
  })
}

test('contagem de jogos por formato', () => {
  assert.equal(computeTournament(setup(8)).totalMatches, 12 + 2 + 1 + 1)
  assert.equal(computeTournament(setup(7)).totalMatches, 12 + 2 + 1 + 1)
  assert.equal(computeTournament(setup(11)).totalMatches, 18 + 4 + 2 + 1 + 1)
  assert.equal(computeTournament(setup(9)).totalMatches, 9 + 3 + 3 + 2 + 1 + 1)
  assert.equal(computeTournament(setup(10)).totalMatches, 10 + 3 + 3 + 2 + 1 + 1)
  assert.equal(computeTournament(setup(12)).totalMatches, 18 + 4 + 2 + 1 + 1)
})

test('café com leite classificado abre vaga no outro grupo (7)', () => {
  const f = FORMATS[7]
  const players = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `J${i}`, team: `t${i}` }))
  const cafe = 'p6'
  const groups = [{ id: 'A', playerIds: ['p0', 'p1', 'p2', cafe] }, { id: 'B', playerIds: ['p3', 'p4', 'p5', cafe] }]
  const st = { format: 7, players, groups, cafe, groupMatches: buildGroupMatches(groups, null, cafe), results: {}, overrides: {} }
  // café vence todos no grupo A e perde todos no B
  for (const m of st.groupMatches) {
    let hg = 1, ag = 0
    if (m.groupId === 'A' && m.awayId === cafe) { hg = 0; ag = 3 }
    if (m.groupId === 'A' && m.homeId === cafe) { hg = 3; ag = 0 }
    if (m.groupId === 'B' && m.homeId === cafe) { hg = 0; ag = 2 }
    st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg, ag, scorers: [] }
  }
  const t = computeTournament(st)
  assert.equal(t.cafeGroup, 'A')
  assert.ok(t.qualified.has(cafe))
  assert.equal(t.qualified.size, 4)
  assert.equal([...t.qualified].filter((id) => groups[1].playerIds.includes(id) && id !== cafe).length, 2)
  void f
})
