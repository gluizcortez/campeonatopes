// "Editar confronto": ninguém pode acabar em dois jogos da mesma fase depois de uma troca.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyOverride, buildGroupMatches, computeTournament, FORMATS, GROUP_IDS, planOverride } from '../src/logic/tournament.js'

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

function stagePlayers(t, stage) {
  return t.matches.filter((m) => m.stage === stage).flatMap((m) => [m.homeId, m.awayId]).filter(Boolean)
}

test('inverter o mando e trazer alguém de outro jogo manda para lá quem saiu', () => {
  const st = setup(8, rng(1))
  for (const m of st.groupMatches) st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg: 1, ag: 0 }
  let t = computeTournament(st)
  const S1 = t.matches.find((m) => m.id === 'S1')
  const S2 = t.matches.find((m) => m.id === 'S2')
  // S1 passa a ser: mandante da S2 × mandante da S1 (o visitante da S1 sai)
  const swaps = planOverride(t.matches, S1, S2.homeId, S1.homeId)
  assert.deepEqual(swaps.map((x) => [x.newId, x.oldId, x.other.id]), [[S2.homeId, S1.awayId, 'S2']])
  applyOverride(st.overrides, S1, S2.homeId, S1.homeId, swaps)
  t = computeTournament(st)
  const s1 = t.matches.find((m) => m.id === 'S1')
  const s2 = t.matches.find((m) => m.id === 'S2')
  assert.deepEqual([s1.homeId, s1.awayId], [S2.homeId, S1.homeId])
  assert.deepEqual([s2.homeId, s2.awayId], [S1.awayId, S2.awayId])
})

test('só inverter o mando não mexe em outro jogo', () => {
  const st = setup(8, rng(2))
  for (const m of st.groupMatches) st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg: 2, ag: 1 }
  const t = computeTournament(st)
  const S1 = t.matches.find((m) => m.id === 'S1')
  assert.deepEqual(planOverride(t.matches, S1, S1.awayId, S1.homeId), [])
})

for (const format of [7, 8, 9, 10, 11, 12]) {
  test(`formato ${format}: trocas aleatórias nunca repetem jogador na fase`, () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rand = rng(seed * 31 + format)
      const st = setup(format, rand)
      for (let step = 0; step < 300; step++) {
        const t = computeTournament(st)
        if (t.finished) break
        const ko = t.ready.filter((m) => m.knockout && m.stage !== 'repescagem' && m.stage !== 'pato')
        if (ko.length && rand() < 0.5) {
          const m = ko[Math.floor(rand() * ko.length)]
          const pool = stagePlayers(t, m.stage)
          const pick = () => pool[Math.floor(rand() * pool.length)]
          const h = pick()
          let a = pick()
          while (a === h) a = pick()
          const swaps = planOverride(t.matches, m, h, a)
          if (swaps.some((x) => x.other.result)) continue // a tela bloqueia esse caso
          const before = stagePlayers(t, m.stage).slice().sort()
          applyOverride(st.overrides, m, h, a, swaps)
          const after = stagePlayers(computeTournament(st), m.stage)
          assert.equal(new Set(after).size, after.length, `[seed ${seed}] jogador repetido na fase ${m.stage}`)
          assert.deepEqual(after.slice().sort(), before, `[seed ${seed}] a troca mudou quem está na fase ${m.stage}`)
          continue
        }
        const m = t.ready[Math.floor(rand() * t.ready.length)]
        const hg = Math.floor(rand() * 4), ag = Math.floor(rand() * 4)
        st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg, ag, ph: m.knockout && hg === ag ? 5 : null, pa: m.knockout && hg === ag ? 3 : null }
      }
    }
  })
}

test('troca com jogo que ainda tinha um lado automático (líder da repescagem)', () => {
  const st = setup(9, rng(5))
  // grupos e mata-mata: mandante sempre vence
  for (;;) {
    const t = computeTournament(st)
    const m = t.ready.find((x) => x.stage === 'group' || x.stage === 'second')
    if (!m) break
    st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg: 1, ag: 0 }
  }
  let t = computeTournament(st)
  let S1 = t.matches.find((m) => m.id === 'S1')
  let S2 = t.matches.find((m) => m.id === 'S2')
  assert.equal(S1.awayId, null, 'líder da repescagem ainda indefinido')
  // 1ª troca: o mandante da S1 vai para a S2 (S1 fica com o lado do visitante automático)
  let swaps = planOverride(t.matches, S2, S1.homeId, S2.awayId)
  applyOverride(st.overrides, S2, S1.homeId, S2.awayId, swaps)
  // termina a repescagem
  for (const id of ['R1', 'R2', 'R3']) {
    const m = computeTournament(st).matches.find((x) => x.id === id)
    st.results[id] = { homeId: m.homeId, awayId: m.awayId, hg: 2, ag: 0 }
  }
  t = computeTournament(st)
  S1 = t.matches.find((m) => m.id === 'S1')
  S2 = t.matches.find((m) => m.id === 'S2')
  assert.ok(S1.awayId, 'líder da repescagem definido')
  // 2ª troca: o líder da repescagem vai para a S2 no lugar do visitante
  swaps = planOverride(t.matches, S2, S2.homeId, S1.awayId)
  applyOverride(st.overrides, S2, S2.homeId, S1.awayId, swaps)
  t = computeTournament(st)
  const ids = t.matches.filter((m) => m.stage === 'semi').flatMap((m) => [m.homeId, m.awayId])
  assert.equal(new Set(ids).size, 4, 'ninguém em duas semifinais')
})
