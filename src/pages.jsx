import { useMemo, useState } from 'react'
import { useStore } from './store.jsx'
import { Card, Confirm, Empty, Flag, PlayerTag } from './components/common.jsx'
import { MatchCard } from './components/Match.jsx'
import { GroupTable, Legend, PatoRanking, RepescagemTable, Scorers, ThirdsTable, FormatInfo } from './components/Tables.jsx'
import { Bracket } from './components/Bracket.jsx'
import { TeamPicker } from './components/Setup.jsx'
import { ImportButton, exportState } from './components/Backup.jsx'
import { FORMATS, STAGES, computePlayerStats, computeScorers, playerStatus } from './logic/tournament.js'
import { TEAM_BY_ID } from './data/teams.js'

function Podium() {
  const { tournament: t } = useStore()
  if (!t.champion && !t.pato) return null
  return (
    <div className="podium">
      {t.champion && (
        <div className="pod champion">
          <div className="pod-icon">🏆</div>
          <div className="pod-label">Campeão</div>
          <PlayerTag id={t.champion} size={30} />
        </div>
      )}
      {t.vice && (
        <div className="pod vice">
          <div className="pod-icon">🥈</div>
          <div className="pod-label">Vice</div>
          <PlayerTag id={t.vice} size={24} />
        </div>
      )}
      {t.pato && (
        <div className="pod pato">
          <div className="pod-icon">🦆</div>
          <div className="pod-label">Pato do campeonato</div>
          <PlayerTag id={t.pato} size={24} />
        </div>
      )}
    </div>
  )
}

export function Home({ open, goTo }) {
  const { state, tournament: t } = useStore()
  const scorers = useMemo(() => computeScorers(t, state.players), [t, state.players])
  const pct = Math.round((t.playedCount / t.totalMatches) * 100)
  const patoMatch = t.matches.find((m) => m.id === 'PATO')
  const [showAll, setShowAll] = useState(false)
  const waiting = t.matches.filter((m) => !m.result && (!m.homeId || !m.awayId)).length

  return (
    <div className="page home">
      <div className="progress-card">
        <div>
          <div className="pc-title">{t.finished ? 'Campeonato encerrado' : stageNow(t)}</div>
          <div className="muted small">{t.playedCount} de {t.totalMatches} partidas jogadas</div>
        </div>
        <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
        <div className="pc-pct">{pct}%</div>
      </div>

      <Podium />

      {!t.finished && (
        <Card
          title={`Partidas para jogar${t.ready.length ? ` (${t.ready.length})` : ''}`}
          icon="🎮"
          action={t.ready.length > READY_LIMIT && (
            <button className="link-btn" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Mostrar menos' : 'Ver todas'}</button>
          )}
          className="ready-card"
        >
          <p className="muted small" style={{ marginTop: 0 }}>
            Confrontos já definidos e sem resultado. Joguem na ordem que quiserem, até mais de um ao mesmo tempo. Toque no jogo para lançar o placar.
          </p>
          {t.ready.length ? (
            <div className="match-grid">
              {(showAll ? t.ready : t.ready.slice(0, READY_LIMIT)).map((m) => <MatchCard key={m.id} match={m} onOpen={open} />)}
            </div>
          ) : (
            <Empty icon="⏳">Nenhuma partida liberada no momento.</Empty>
          )}
          {waiting > 0 && (
            <div className="muted small waiting-note">
              ⏳ Mais {waiting} {waiting === 1 ? 'partida aguarda' : 'partidas aguardam'} o resultado de jogos anteriores para ter o confronto definido.
            </div>
          )}
        </Card>
      )}

      <Card title="Últimos resultados" icon="✅" action={t.recent.length > 0 && <button className="link-btn" onClick={() => goTo('matches')}>Ver todas</button>}>
        {t.recent.length ? (
          <div className="match-grid">{t.recent.slice(0, 4).map((m) => <MatchCard key={m.id} match={m} onOpen={open} />)}</div>
        ) : (
          <Empty icon="⚽">Nenhum jogo disputado ainda. Bola rolando!</Empty>
        )}
      </Card>

      <Card title="Grupos" icon="🟢" action={<button className="link-btn" onClick={() => goTo('groups')}>Detalhes</button>}>
        <div className={`groups-grid g${state.groups.length}`}>
          {state.groups.map((g) => <GroupTable key={g.id} groupId={g.id} compact />)}
        </div>
      </Card>

      <Card title="Chaves" icon="⚔️" action={<button className="link-btn" onClick={() => goTo('bracket')}>Ver chave completa</button>}>
        <Bracket onOpen={open} compact />
      </Card>

      <div className="grid-2">
        <Card title="Artilharia" icon="👟" action={<button className="link-btn" onClick={() => goTo('scorers')}>Ver todos</button>}>
          <Scorers list={scorers} limit={5} />
        </Card>
        <Card title="Briga do Pato" icon="🦆" action={<button className="link-btn" onClick={() => goTo('pato')}>Detalhes</button>}>
          {patoMatch?.homeId ? (
            <MatchCard match={patoMatch} onOpen={open} />
          ) : (
            <>
              <p className="muted small" style={{ marginTop: 0 }}>
                Os 2 piores entre os eliminados na fase de grupos disputam o pato.
              </p>
              <PatoRanking />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

const READY_LIMIT = 6

function stageNow(t) {
  if (!t.phase1Done) return 'Fase de grupos em andamento'
  const stages = [...new Set(t.ready.map((m) => STAGES[m.stage]))]
  return stages.length ? `${stages.join(' · ')} em andamento` : 'Aguardando definição'
}

const FILTERS = [
  { id: 'pending', label: 'Pendentes' },
  { id: 'played', label: 'Jogadas' },
  { id: 'all', label: 'Todas' },
]

export function Matches({ open }) {
  const { tournament: t } = useStore()
  const [filter, setFilter] = useState('pending')
  const list = t.matches.filter((m) => (filter === 'all' ? true : filter === 'played' ? !!m.result : !m.result))
  const sections = []
  for (const m of list) {
    const key = m.stage === 'group' ? `Fase de grupos · Rodada ${m.round}` : STAGES[m.stage]
    let sec = sections.find((s) => s.key === key)
    if (!sec) sections.push((sec = { key, items: [] }))
    sec.items.push(m)
  }
  return (
    <div className="page">
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      {!sections.length && <Card><Empty icon="🎉">Nada por aqui.</Empty></Card>}
      {sections.map((s) => (
        <section key={s.key} className="match-section">
          <h3 className="section-title">{s.key}</h3>
          <div className="match-grid">
            {s.items.map((m) => <MatchCard key={m.id} match={m} onOpen={open} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

export function Groups({ open }) {
  const { state, tournament: t } = useStore()
  return (
    <div className="page">
      <Legend />
      <div className="groups-full">
        {state.groups.map((g) => (
          <Card key={g.id} className="group-card">
            <GroupTable groupId={g.id} />
            <div className="group-matches">
              {t.matches.filter((m) => m.groupId === g.id).map((m) => <MatchCard key={m.id} match={m} onOpen={open} />)}
            </div>
          </Card>
        ))}
      </div>
      {FORMATS[state.format].ko === 'quarters' && (
        <Card title="Ranking dos 3º colocados" icon="🥉">
          <p className="muted small" style={{ marginTop: 0 }}>Os 2 melhores terceiros avançam às quartas.</p>
          <ThirdsTable />
        </Card>
      )}
    </div>
  )
}

export function BracketPage({ open }) {
  const { state, tournament: t } = useStore()
  return (
    <div className="page">
      <Card title="Chave do mata-mata" icon="⚔️">
        {!t.phase1Done && <p className="muted small" style={{ marginTop: 0 }}>Os confrontos aparecem quando a fase de grupos terminar.</p>}
        <Bracket onOpen={open} />
      </Card>
      {FORMATS[state.format].ko === 'quarters' && t.phase1Done && (
        <Card title="Ranking geral dos classificados" icon="📊">
          <div className="mini-rank">
            {t.overallSeeds.map((id, i) => (
              <div className="mr-row" key={id}>
                <span className="mr-pos">{i + 1}º</span>
                <PlayerTag id={id} size={18} />
                <span className="mr-group">{t.groupPos[id].pos}º Gr. {t.groupPos[id].group}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {FORMATS[state.format].repescagem && (
        <Card title="Repescagem" icon="🔁">
          <p className="muted small" style={{ marginTop: 0 }}>Triangular entre os 3 perdedores do mata-mata. O líder vai à semifinal contra o melhor vencedor.</p>
          <RepescagemTable />
        </Card>
      )}
      <Card title="Regras do formato" icon="📋"><FormatInfo format={state.format} /></Card>
    </div>
  )
}

export function ScorersPage() {
  const { state, tournament: t } = useStore()
  const scorers = useMemo(() => computeScorers(t, state.players), [t, state.players])
  const stats = computePlayerStats(t, state.players)
  const attack = [...stats.values()].filter((r) => r.j).sort((a, b) => b.gp / b.j - a.gp / a.j || b.gp - a.gp)
  const defense = [...stats.values()].filter((r) => r.j).sort((a, b) => a.gc / a.j - b.gc / b.j || a.gc - b.gc)
  const totalGoals = t.matches.reduce((n, m) => n + (m.result ? m.result.hg + m.result.ag : 0), 0)
  return (
    <div className="page">
      <div className="stat-tiles">
        <div className="tile"><div className="tile-num">{totalGoals}</div><div className="tile-label">gols no campeonato</div></div>
        <div className="tile"><div className="tile-num">{t.playedCount ? (totalGoals / t.playedCount).toFixed(1) : '0'}</div><div className="tile-label">gols por jogo</div></div>
        <div className="tile"><div className="tile-num">{scorers[0]?.goals || 0}</div><div className="tile-label">gols do artilheiro</div></div>
      </div>
      <div className="grid-2">
        <Card title="Artilharia" icon="👟">
          <Scorers list={scorers} />
        </Card>
        <div className="stack">
          <Card title="Melhor ataque" icon="🔥" action={<span className="muted small">média por jogo</span>}>
            <RankList rows={attack.slice(0, 5)} value={(r) => `${r.gp} gols · ${(r.gp / r.j).toFixed(1)}/jogo`} />
          </Card>
          <Card title="Melhor defesa" icon="🧱" action={<span className="muted small">média por jogo</span>}>
            <RankList rows={defense.slice(0, 5)} value={(r) => `${r.gc} sofridos · ${(r.gc / r.j).toFixed(1)}/jogo`} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function RankList({ rows, value }) {
  if (!rows.length) return <div className="muted small">Sem jogos ainda.</div>
  return (
    <div className="mini-rank">
      {rows.map((r, i) => (
        <div className="mr-row" key={r.playerId}>
          <span className="mr-pos">{i + 1}º</span>
          <PlayerTag id={r.playerId} size={18} />
          <span className="mr-stat">{value(r)}</span>
        </div>
      ))}
    </div>
  )
}

export function PatoPage({ open }) {
  const { tournament: t } = useStore()
  const m = t.matches.find((x) => x.id === 'PATO')
  return (
    <div className="page">
      <div className="pato-hero">
        <div className="pato-duck">🦆</div>
        <div>
          <h2>A disputa do Pato</h2>
          <p className="muted">
            Os 2 piores do campeonato (entre quem não passou da fase de grupos) se enfrentam. Quem perder leva o título de Pato.
          </p>
        </div>
      </div>
      {t.pato && (
        <Card className="pato-winner">
          <div className="pod-label">🦆 Pato do campeonato</div>
          <PlayerTag id={t.pato} size={34} />
        </Card>
      )}
      <Card title="Jogo do Pato" icon="🦆"><MatchCard match={m} onOpen={open} /></Card>
      <Card title="Ranking dos eliminados" icon="📉">
        <p className="muted small" style={{ marginTop: 0 }}>
          Ordenado por pontos, vitórias, saldo e gols pró. Os 2 últimos (🦆) vão para a disputa.
        </p>
        <PatoRanking />
      </Card>
    </div>
  )
}

function NameEdit({ value, onSave, taken }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [err, setErr] = useState('')
  const done = () => {
    const v = draft.trim()
    // nome vazio ou repetido não é salvo (o nome também é usado como último critério de desempate)
    if (v && taken.includes(v.toLowerCase())) {
      setErr('Já existe um jogador com esse nome.')
      setDraft(value)
    } else {
      if (v) onSave(v)
      else setDraft(value)
      setErr('')
    }
    setEditing(false)
  }
  if (!editing) {
    return (
      <>
        <button className="name-btn" onClick={() => { setDraft(value); setEditing(true) }} title="Editar nome">
          <span>{value}</span> <span className="name-pen">✏️</span>
        </button>
        {err && <div className="warn small" style={{ marginTop: 2 }}>{err}</div>}
      </>
    )
  }
  return (
    <input
      className="inline-input"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => { if (e.key === 'Enter') done(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
    />
  )
}

export function Players() {
  const { state, tournament: t, update } = useStore()
  const [picker, setPicker] = useState(null)
  const stats = computePlayerStats(t, state.players)
  const takenBy = Object.fromEntries(state.players.map((p) => [p.team, p.name]))
  const pickerPlayer = state.players.find((p) => p.id === picker)
  return (
    <div className="page">
      <div className="players-grid">
        {state.players.map((p) => {
          const s = stats.get(p.id)
          const st = playerStatus(t, p.id)
          const team = TEAM_BY_ID[p.team]
          return (
            <div className="player-card" key={p.id} style={{ '--team': team?.color }}>
              <div className="pc-head">
                <button className="flag-btn" onClick={() => setPicker(p.id)} title="Trocar seleção"><Flag team={p.team} size={40} /></button>
                <div className="pc-info">
                  <NameEdit
                    value={p.name}
                    taken={state.players.filter((y) => y.id !== p.id).map((y) => y.name.trim().toLowerCase())}
                    onSave={(name) => update((x) => { x.players.find((y) => y.id === p.id).name = name })}
                  />
                  <div className="muted small">
                    {team?.name} · {t.cafe === p.id
                      ? `Grupos ${state.groups.filter((g) => g.playerIds.includes(p.id)).map((g) => g.id).join(' e ')}`
                      : `Grupo ${t.groupPos[p.id]?.group}`}
                    {state.seeds.includes(p.id) ? ' · ★ Cabeça' : ''}
                    {t.cafe === p.id ? ' · ☕ Café com leite' : ''}
                  </div>
                </div>
                <span className={`status s-${st.tone}`}>{st.label}</span>
              </div>
              <div className="pc-stats">
                <div><b>{s.j}</b><span>J</span></div>
                <div><b>{s.v}</b><span>V</span></div>
                <div><b>{s.e}</b><span>E</span></div>
                <div><b>{s.d}</b><span>D</span></div>
                <div><b>{s.gp}</b><span>GP</span></div>
                <div><b>{s.gc}</b><span>GC</span></div>
              </div>
            </div>
          )
        })}
      </div>
      <TeamPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        value={pickerPlayer?.team}
        takenBy={takenBy}
        onPick={(team) => update((x) => { x.players.find((y) => y.id === picker).team = team })}
      />
    </div>
  )
}

export function Settings() {
  const { state, update, reset, savedAt } = useStore()
  const [confirm, setConfirm] = useState(null)
  const f = FORMATS[state.format]
  return (
    <div className="page settings">
      <Card title="Campeonato" icon="⚙️">
        <label className="field">
          <span>Nome</span>
          <input value={state.name} onChange={(e) => update((s) => { s.name = e.target.value })} />
        </label>
        <div className="muted small">Formato: {f?.title} · Dados salvos neste navegador{savedAt ? ` (última gravação às ${new Date(savedAt).toLocaleTimeString('pt-BR')})` : ''}.</div>
      </Card>
      <Card title="Backup" icon="💾">
        <p className="muted small" style={{ marginTop: 0 }}>
          Os dados ficam salvos automaticamente neste navegador. Para continuar em outro computador ou celular, exporte e importe o arquivo.
        </p>
        <div className="row">
          <button className="btn ghost small" onClick={() => exportState(state)}>⬇️ Exportar backup</button>
          <ImportButton />
        </div>
      </Card>
      <Card title="Zona de perigo" icon="⚠️" className="danger-zone">
        <div className="dz-row">
          <div><b>Refazer grupos</b><div className="muted small">Volta para a configuração mantendo jogadores e seleções. Apaga todos os resultados.</div></div>
          <button className="btn danger ghost small" onClick={() => setConfirm('regroup')}>Refazer</button>
        </div>
        <div className="dz-row">
          <div><b>Zerar resultados</b><div className="muted small">Mantém grupos e jogadores, apaga todos os placares.</div></div>
          <button className="btn danger ghost small" onClick={() => setConfirm('results')}>Zerar</button>
        </div>
        <div className="dz-row">
          <div><b>Novo campeonato</b><div className="muted small">Apaga tudo e começa do zero. Exporte um backup antes se quiser guardar.</div></div>
          <button className="btn danger small" onClick={() => setConfirm('all')}>Apagar tudo</button>
        </div>
      </Card>
      <Confirm
        open={!!confirm}
        danger
        title={{ regroup: 'Refazer grupos?', results: 'Zerar resultados?', all: 'Começar um novo campeonato?' }[confirm]}
        message="Essa ação não pode ser desfeita."
        confirmLabel="Sim, continuar"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'all') reset()
          if (confirm === 'results') update((s) => { s.results = {}; s.overrides = {} })
          if (confirm === 'regroup') update((s) => { s.results = {}; s.overrides = {}; s.status = 'setup'; s.setupStep = 3; s.groupMatches = [] })
        }}
      />
    </div>
  )
}
