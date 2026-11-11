// Validação: simula muitos campeonatos e confere o resultado com um verificador independente,
// escrito do zero a partir das regras (sem reaproveitar a lógica do app).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGroupMatches, computeTournament, computeScorers, computePlayerStats, FORMATS, GROUP_IDS } from '../src/logic/tournament.js'

function rng(seed) {
  let s = seed >>> 0 || 1
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32)
}

function setup(format, rand) {
  const f = FORMATS[format]
  const players = Array.from({ length: format }, (_, i) => ({ id: `p${i}`, name: `Jogador ${String.fromCharCode(65 + i)}`, team: `t${i}` }))
  const ids = players.map((p) => p.id).sort(() => rand() - 0.5)
  const cafe = f.cafe ? ids.pop() : null
  const groups = GROUP_IDS.slice(0, f.groups).map((id, i) => ({ id, playerIds: cafe && i < 2 ? [cafe] : [] }))
  for (const id of ids) groups.find((g) => g.playerIds.length < f.perGroup).playerIds.push(id)
  return { format, players, groups, cafe, seeds: groups.map((g) => g.playerIds.find((x) => x !== cafe)), groupMatches: buildGroupMatches(groups, null, cafe), results: {}, overrides: {} }
}

const MODES = {
  random: (r) => [Math.floor(r() * 5), Math.floor(r() * 5)],
  draws: () => [0, 0],
  goleada: (r) => (r() < 0.5 ? [Math.floor(r() * 10), 0] : [0, Math.floor(r() * 10)]),
  close: (r) => { const a = Math.floor(r() * 3); return [a, a + (r() < 0.4 ? 0 : r() < 0.5 ? 1 : -1 * (a > 0))] },
}

function play(st, mode, rand) {
  for (let guard = 0; guard < 200; guard++) {
    const t = computeTournament(st)
    if (!t.current) return t
    const m = t.current
    const [hg, ag] = MODES[mode](rand)
    const r = { homeId: m.homeId, awayId: m.awayId, hg, ag, playedAt: guard, scorers: [] }
    for (let i = 0; i < hg; i++) r.scorers.push({ side: 'home', name: `Artilheiro ${m.homeId}` })
    for (let i = 0; i < ag; i++) r.scorers.push({ side: 'away', name: `Artilheiro ${m.awayId}`, ownGoal: i === 0 && rand() < 0.2 })
    if (m.knockout && hg === ag) { r.ph = 4; r.pa = 4; while (r.ph === r.pa) { r.ph = Math.floor(rand() * 6); r.pa = Math.floor(rand() * 6) } }
    st.results[m.id] = r
  }
  throw new Error('loop infinito')
}

// ---------- verificador independente ----------
function table(ids, matches, results) {
  const row = Object.fromEntries(ids.map((id) => [id, { id, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }]))
  for (const m of matches) {
    const r = results[m.id]
    if (!r || !(m.homeId in row) || !(m.awayId in row)) continue
    const h = row[m.homeId], a = row[m.awayId]
    h.j++; a.j++; h.gp += r.hg; h.gc += r.ag; a.gp += r.ag; a.gc += r.hg
    if (r.hg > r.ag) { h.v++; a.d++; h.pts += 3 } else if (r.hg < r.ag) { a.v++; h.d++; a.pts += 3 } else { h.e++; a.e++; h.pts++; a.pts++ }
  }
  return Object.values(row)
}
const cmp = (a, b) => b.pts - a.pts || b.v - a.v || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp

function check(st, t) {
  const f = FORMATS[st.format]
  const name = (id) => st.players.find((p) => p.id === id).name
  const byM = Object.fromEntries(t.matches.map((m) => [m.id, m]))
  const win = (id) => { const m = byM[id], r = m.result; return r.hg > r.ag || (r.hg === r.ag && r.ph > r.pa) ? m.homeId : m.awayId }
  const lose = (id) => { const m = byM[id]; return win(id) === m.homeId ? m.awayId : m.homeId }

  // todos os jogos jogados, sem jogador contra ele mesmo
  for (const m of t.matches) {
    assert.ok(m.result, `${m.id} sem resultado`)
    assert.notEqual(m.homeId, m.awayId, `${m.id} jogador contra ele mesmo`)
  }

  // tabelas dos grupos (inclui café em ambos)
  const tables = {}
  for (const g of st.groups) {
    const gm = st.groupMatches.filter((m) => m.groupId === g.id)
    // todos contra todos no grupo (exceto 10 jogadores: 2 jogos cada)
    const expected = st.format === 10 ? 5 : (g.playerIds.length * (g.playerIds.length - 1)) / 2
    assert.equal(gm.length, expected, `grupo ${g.id} quantidade de jogos`)
    const rows = table(g.playerIds, gm, st.results).sort((a, b) => cmp(a, b) || name(a.id).localeCompare(name(b.id)))
    tables[g.id] = rows
    const app = t.groupTables[g.id]
    assert.deepEqual(app.map((r) => r.playerId), rows.map((r) => r.id), `ordem do grupo ${g.id}`)
    app.forEach((r, i) => {
      const x = rows[i]
      assert.deepEqual([r.pts, r.j, r.v, r.e, r.d, r.gp, r.gc, r.sg], [x.pts, x.j, x.v, x.e, x.d, x.gp, x.gc, x.gp - x.gc], `stats ${r.playerId}`)
    })
    const totPts = rows.reduce((s, r) => s + r.pts, 0)
    const draws = gm.filter((m) => st.results[m.id].hg === st.results[m.id].ag).length
    assert.equal(totPts, 3 * (gm.length - draws) + 2 * draws, 'soma de pontos')
  }

  // café com leite conta no grupo onde foi melhor
  const real = {}
  let cafeGroup = null
  if (st.cafe) {
    const opts = st.groups.filter((g) => g.playerIds.includes(st.cafe)).map((g) => ({ g: g.id, i: tables[g.id].findIndex((r) => r.id === st.cafe) }))
    opts.sort((a, b) => a.i - b.i || cmp(tables[a.g][a.i], tables[b.g][b.i]) || a.g.localeCompare(b.g))
    cafeGroup = opts[0].g
    assert.equal(t.cafeGroup, cafeGroup, 'grupo do café')
  }
  for (const g of st.groups) real[g.id] = tables[g.id].filter((r) => r.id !== st.cafe || g.id === cafeGroup)

  const posOf = {}
  for (const g of st.groups) real[g.id].forEach((r, i) => { posOf[r.id] = { g: g.id, pos: i + 1, row: r } })
  const overall = (a, b) => posOf[a].pos - posOf[b].pos || cmp(posOf[a].row, posOf[b].row) || name(a).localeCompare(name(b))
  const P = (g, n) => real[g][n - 1].id

  let qualified
  if (f.ko === 'quarters') {
    const thirds = st.groups.map((g) => real[g.id][2].id).sort(overall)
    qualified = [...st.groups.flatMap((g) => [P(g.id, 1), P(g.id, 2)]), thirds[0], thirds[1]]
  } else {
    const n = st.format === 10 ? 3 : 2
    qualified = st.groups.flatMap((g) => real[g.id].slice(0, n).map((r) => r.id))
  }
  assert.deepEqual([...t.qualified].sort(), qualified.slice().sort(), 'classificados')
  const expectedQ = { 7: 4, 8: 4, 9: 6, 10: 6, 11: 8, 12: 8 }[st.format]
  assert.equal(qualified.length, expectedQ, 'quantidade de classificados')

  const pair = (id, h, a) => {
    assert.equal(byM[id].homeId, h, `${id} mandante`)
    assert.equal(byM[id].awayId, a, `${id} visitante`)
  }

  if (f.ko === 'semis') {
    pair('S1', P('A', 1), P('B', 2))
    pair('S2', P('B', 1), P('A', 2))
  }
  if (f.ko === 'repescagem') {
    if (st.format === 9) { pair('K1', P('A', 1), P('B', 2)); pair('K2', P('B', 1), P('C', 2)); pair('K3', P('C', 1), P('A', 2)) }
    else { pair('K1', P('A', 1), P('B', 3)); pair('K2', P('B', 1), P('A', 3)); pair('K3', P('A', 2), P('B', 2)) }
    const L = ['K1', 'K2', 'K3'].map(lose)
    pair('R1', L[0], L[1]); pair('R2', L[2], L[0]); pair('R3', L[1], L[2])
    const seeds = qualified.slice().sort(overall)
    const rank = (id) => seeds.indexOf(id)
    const rp = table(L, ['R1', 'R2', 'R3'].map((id) => byM[id]), st.results).sort((a, b) => cmp(a, b) || rank(a.id) - rank(b.id))
    const W = ['K1', 'K2', 'K3'].map(win).sort((a, b) => rank(a) - rank(b))
    pair('S1', W[0], rp[0].id)
    pair('S2', W[1], W[2])
  }
  if (f.ko === 'quarters') {
    const s = qualified.slice().sort(overall)
    const qs = ['Q1', 'Q2', 'Q3', 'Q4'].map((id) => [byM[id].homeId, byM[id].awayId])
    // mesmos 8, cada um uma vez
    assert.deepEqual(qs.flat().sort(), s.slice().sort(), 'quartas com os 8 classificados')
    // mandantes são os 4 melhores
    assert.deepEqual(qs.map((q) => q[0]).sort(), [s[0], s[3], s[1], s[2]].sort(), 'mandantes das quartas')
    for (const [h, a] of qs) {
      const same = posOf[h].g === posOf[a].g
      if (same) {
        // só aceitável se nenhuma troca resolveria (não deveria acontecer com 3 grupos)
        assert.fail(`quartas com jogadores do mesmo grupo: ${h} × ${a}`)
      }
    }
    pair('S1', win('Q1'), win('Q2'))
    pair('S2', win('Q3'), win('Q4'))
  }
  pair('F', win('S1'), win('S2'))
  assert.equal(t.champion, win('F'))
  assert.equal(t.vice, lose('F'))

  // pato: 2 piores entre os eliminados
  const elim = st.players.map((p) => p.id).filter((id) => !qualified.includes(id))
  const elimSorted = elim.sort((a, b) => cmp(posOf[a].row, posOf[b].row) || posOf[a].pos - posOf[b].pos || name(a).localeCompare(name(b)))
  assert.equal(elim.length, st.format - expectedQ, 'eliminados')
  pair('PATO', elimSorted[elimSorted.length - 2], elimSorted[elimSorted.length - 1])
  assert.equal(t.pato, lose('PATO'))
  assert.ok(!qualified.includes(t.pato))

  // artilharia: soma de gols (sem gol contra) bate com os registros
  const sc = computeScorers(t, st.players)
  const totalScorers = sc.reduce((s, x) => s + x.goals, 0)
  let expectedGoals = 0
  for (const m of t.matches) for (const g of m.result.scorers) if (!g.ownGoal) expectedGoals++
  assert.equal(totalScorers, expectedGoals, 'artilharia')
  for (let i = 1; i < sc.length; i++) assert.ok(sc[i - 1].goals >= sc[i].goals, 'artilharia ordenada')

  // estatísticas gerais batem com todos os jogos
  const stats = computePlayerStats(t, st.players)
  const totalJ = [...stats.values()].reduce((s, r) => s + r.j, 0)
  assert.equal(totalJ, t.matches.length * 2, 'jogos totais')
  const gp = [...stats.values()].reduce((s, r) => s + r.gp, 0)
  const gc = [...stats.values()].reduce((s, r) => s + r.gc, 0)
  assert.equal(gp, gc, 'gols pró = gols contra')
}

for (const format of [7, 8, 9, 10, 11, 12]) {
  for (const mode of Object.keys(MODES)) {
    test(`formato ${format} · ${mode} · 60 campeonatos`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const rand = rng(seed * 7919 + format * 31 + mode.length)
        const st = setup(format, rand)
        const t = play(st, mode, rand)
        assert.ok(t.finished, 'terminou')
        try { check(st, t) } catch (e) { e.message = `[seed ${seed}] ${e.message}`; throw e }
      }
    })
  }
}

test('editar um resultado antigo invalida o mata-mata afetado e reabre os jogos', () => {
  const rand = rng(42)
  const st = setup(12, rand)
  const t1 = play(st, 'random', rand)
  assert.ok(t1.finished)
  // vira o placar de um jogo de grupo de forma drástica
  const gm = st.groupMatches[0]
  const r = st.results[gm.id]
  st.results[gm.id] = { ...r, hg: r.ag + 9, ag: 0 }
  const t2 = computeTournament(st)
  // nenhum jogo com resultado deve ter participantes diferentes do registrado
  for (const m of t2.matches) if (m.result) assert.equal(m.result.homeId, m.homeId)
  // pode ou não mudar o chaveamento, mas nunca quebra
  if (!t2.finished) {
    assert.ok(t2.current, 'existe próxima partida para jogar')
    const t3 = play(st, 'random', rand)
    check(st, t3)
  }
})

test('confronto ajustado manualmente é respeitado e pode ser desfeito', () => {
  const rand = rng(7)
  const st = setup(8, rand)
  for (const m of st.groupMatches) st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg: 1, ag: 0, scorers: [] }
  const t = computeTournament(st)
  const s1 = t.matches.find((m) => m.id === 'S1')
  const s2 = t.matches.find((m) => m.id === 'S2')
  st.overrides.S1 = { homeId: s1.homeId, awayId: s2.homeId }
  const t2 = computeTournament(st)
  const o = t2.matches.find((m) => m.id === 'S1')
  assert.equal(o.awayId, s2.homeId)
  assert.ok(o.overridden)
  delete st.overrides.S1
  assert.equal(computeTournament(st).matches.find((m) => m.id === 'S1').awayId, s1.awayId)
})

test('empate no mata-mata sem pênaltis não define vencedor', () => {
  const rand = rng(3)
  const st = setup(8, rand)
  for (const m of st.groupMatches) st.results[m.id] = { homeId: m.homeId, awayId: m.awayId, hg: 2, ag: 1, scorers: [] }
  let t = computeTournament(st)
  const s1 = t.matches.find((m) => m.id === 'S1')
  st.results.S1 = { homeId: s1.homeId, awayId: s1.awayId, hg: 1, ag: 1, ph: null, pa: null, scorers: [] }
  t = computeTournament(st)
  assert.equal(t.outcomes.S1, null)
  assert.equal(t.matches.find((m) => m.id === 'F').homeId, null)
})

test('campeonato vazio não quebra', () => {
  for (const format of [7, 8, 9, 10, 11, 12]) {
    const st = setup(format, rng(1))
    const t = computeTournament(st)
    assert.ok(t.current)
    assert.equal(t.playedCount, 0)
    assert.equal(t.champion, null)
  }
})
