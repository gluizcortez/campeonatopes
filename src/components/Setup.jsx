import { useEffect, useState } from 'react'
import { useStore, uid } from '../store.jsx'
import { TEAMS, TEAM_BY_ID } from '../data/teams.js'
import { FORMATS, GROUP_IDS, buildGroupMatches, defaultGroupMatchups } from '../logic/tournament.js'
import { Flag, Modal, PlayerTag } from './common.jsx'
import { FormatInfo } from './Tables.jsx'
import { ImportButton } from './Backup.jsx'

const STEPS = ['Formato', 'Jogadores', 'Cabeças de chave', 'Grupos', 'Começar']

export function TeamPicker({ open, onClose, value, takenBy, onPick }) {
  return (
    <Modal open={open} onClose={onClose} title="Escolha a seleção" wide>
      <div className="team-grid">
        {TEAMS.map((t) => {
          const owner = takenBy[t.id]
          const mine = value === t.id
          return (
            <button
              key={t.id}
              className={`team-opt ${mine ? 'selected' : ''} ${owner && !mine ? 'taken' : ''}`}
              disabled={!!owner && !mine}
              onClick={() => { onPick(t.id); onClose() }}
            >
              <Flag team={t.id} size={34} />
              <span>{t.name}</span>
              {owner && !mine && <small>{owner}</small>}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

function StepFormat() {
  const { state, update } = useStore()
  return (
    <div className="setup-step">
      <label className="field">
        <span>Nome do campeonato</span>
        <input value={state.name} onChange={(e) => update((s) => { s.name = e.target.value })} placeholder="Ex: Copa dos Amigos 2026" />
      </label>
      <div className="field"><span>Quantos participantes?</span></div>
      <div className="format-grid">
        {Object.values(FORMATS).map((f) => (
          <button
            key={f.size}
            className={`format-card ${state.format === f.size ? 'selected' : ''}`}
            onClick={() => update((s) => {
              s.format = f.size
              if (!f.cafe) s.cafe = null
              // remove linhas vazias que sobraram de outro formato
              s.players = s.players.filter((p, i) => i < f.size || p.name.trim() || p.team)
              s.seeds = s.seeds.slice(0, f.groups)
              s.groups = []
              s.groupMatchups = {}
            })}
          >
            <div className="fc-num">{f.size}</div>
            <div className="fc-title">{f.title}</div>
            <div className="fc-sum">{f.summary}</div>
          </button>
        ))}
      </div>
      {state.format && (
        <div className="info-box">
          <div className="info-title">Como funciona</div>
          <FormatInfo format={state.format} />
        </div>
      )}
      <div className="info-box subtle">
        <div className="info-title">Tem um backup?</div>
        <p className="muted small" style={{ margin: '0 0 8px' }}>Se você exportou o campeonato em outro computador, pode importar aqui.</p>
        <ImportButton />
      </div>
    </div>
  )
}

function StepPlayers() {
  const { state, update } = useStore()
  const [picker, setPicker] = useState(null)
  const need = state.format
  const takenBy = Object.fromEntries(state.players.filter((p) => p.team).map((p) => [p.team, p.name || 'Outro jogador']))

  useEffect(() => {
    if (state.players.length < need) {
      update((s) => {
        while (s.players.length < need) s.players.push({ id: uid(), name: '', team: '' })
      })
    }
  }, [state.players.length, need, update])

  const set = (id, patch) => update((s) => { Object.assign(s.players.find((p) => p.id === id), patch) })
  const remove = (id) => update((s) => {
    s.players = s.players.filter((p) => p.id !== id)
    s.seeds = s.seeds.filter((x) => x !== id)
    s.groups = []
  })
  const pickerPlayer = state.players.find((p) => p.id === picker)

  return (
    <div className="setup-step">
      <p className="muted">Cadastre os {need} jogadores e a seleção que cada um tirou no sorteio. Cada seleção só pode ser usada uma vez.</p>
      <div className="player-list">
        {state.players.map((p, i) => (
          <div className="player-row" key={p.id}>
            <span className="pr-num">{i + 1}</span>
            <input
              value={p.name}
              placeholder={`Nome do jogador ${i + 1}`}
              onChange={(e) => set(p.id, { name: e.target.value })}
            />
            <button className={`team-btn ${p.team ? '' : 'empty'}`} onClick={() => setPicker(p.id)}>
              {p.team ? <><Flag team={p.team} size={20} /> {TEAM_BY_ID[p.team].name}</> : 'Escolher seleção'}
            </button>
            {state.players.length > need && (
              <button className="icon-btn" onClick={() => remove(p.id)} title="Remover">✕</button>
            )}
          </div>
        ))}
      </div>
      <TeamPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        value={pickerPlayer?.team}
        takenBy={takenBy}
        onPick={(team) => set(picker, { team })}
      />
    </div>
  )
}

function StepSeeds() {
  const { state, update } = useStore()
  const f = FORMATS[state.format]
  const toggle = (id) => update((s) => {
    if (s.seeds.includes(id)) s.seeds = s.seeds.filter((x) => x !== id)
    else if (s.seeds.length < f.groups) s.seeds.push(id)
    if (s.cafe === id) s.cafe = null
    s.groups = []
  })
  const pickCafe = (id) => update((s) => {
    s.cafe = s.cafe === id ? null : id
    s.seeds = s.seeds.filter((x) => x !== id)
    s.groups = []
  })
  return (
    <div className="setup-step">
      <p className="muted">
        Escolha os <b>{f.groups} cabeças de chave</b> (os melhores jogadores). Cada um fica em um grupo diferente.
        A ordem de seleção define o grupo: o 1º vai pro Grupo A, o 2º pro B{f.groups > 2 ? ', o 3º pro C' : ''}.
      </p>
      <div className="seed-grid">
        {state.players.map((p) => {
          const idx = state.seeds.indexOf(p.id)
          if (p.id === state.cafe) return null
          return (
            <button key={p.id} className={`seed-opt ${idx >= 0 ? 'selected' : ''}`} onClick={() => toggle(p.id)}>
              <PlayerTag id={p.id} />
              {idx >= 0 ? <span className="seed-badge">★ Grupo {GROUP_IDS[idx]}</span> : <span className="seed-badge off">☆</span>}
            </button>
          )
        })}
      </div>
      {f.cafe && (
        <>
          <div className="cafe-intro">
            <div className="cafe-icon">☕</div>
            <div>
              <b>Café com leite</b>
              <div className="muted small">
                O jogador mais fraco. Ele joga nos grupos A e B para completar as vagas, mas só conta no grupo em que terminar melhor. Pode se classificar normalmente; no outro grupo ele não ocupa vaga.
              </div>
            </div>
          </div>
          <div className="seed-grid">
            {state.players.filter((p) => !state.seeds.includes(p.id)).map((p) => (
              <button key={p.id} className={`seed-opt cafe ${state.cafe === p.id ? 'selected' : ''}`} onClick={() => pickCafe(p.id)}>
                <PlayerTag id={p.id} />
                {state.cafe === p.id ? <span className="seed-badge">☕ Café com leite</span> : <span className="seed-badge off">☕</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function emptyGroups(state) {
  const f = FORMATS[state.format]
  return GROUP_IDS.slice(0, f.groups).map((id, i) => ({
    id,
    playerIds: f.cafe && state.cafe && i < 2 ? [state.seeds[i], state.cafe] : [state.seeds[i]],
  }))
}

function StepGroups() {
  const { state, update } = useStore()
  const f = FORMATS[state.format]
  const groups = state.groups.length ? state.groups : emptyGroups(state)
  useEffect(() => {
    if (!state.groups.length) update((s) => { s.groups = emptyGroups(s) })
  }, [state.groups.length, update])

  const assigned = new Set(groups.flatMap((g) => g.playerIds))
  const free = state.players.filter((p) => !assigned.has(p.id))

  const addTo = (gid, pid) => update((s) => {
    const g = s.groups.find((x) => x.id === gid)
    if (g.playerIds.length < f.perGroup) g.playerIds.push(pid)
    delete s.groupMatchups[gid]
  })
  const removeFrom = (gid, pid) => update((s) => {
    const g = s.groups.find((x) => x.id === gid)
    g.playerIds = g.playerIds.filter((x) => x !== pid)
    delete s.groupMatchups[gid]
  })
  const randomFill = () => update((s) => {
    const pool = s.players.map((p) => p.id).filter((id) => !s.groups.some((g) => g.playerIds.includes(id)))
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    for (const g of s.groups) {
      while (g.playerIds.length < f.perGroup && pool.length) g.playerIds.push(pool.pop())
    }
    s.groupMatchups = {}
  })
  const clear = () => update((s) => { s.groups = emptyGroups(s); s.groupMatchups = {} })

  return (
    <div className="setup-step">
      <p className="muted">Monte os grupos conforme o sorteio. Toque em um jogador livre e escolha o grupo dele.</p>
      {free.length > 0 && (
        <div className="free-pool">
          <div className="fp-title">Jogadores sem grupo ({free.length})</div>
          <div className="fp-list">
            {free.map((p) => (
              <div className="fp-item" key={p.id}>
                <PlayerTag id={p.id} size={18} />
                <div className="fp-actions">
                  {groups.map((g) => (
                    <button key={g.id} className="chip-btn" disabled={g.playerIds.length >= f.perGroup} onClick={() => addTo(g.id, p.id)}>
                      {g.id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn ghost small" onClick={randomFill}>🎲 Sortear os restantes</button>
          </div>
        </div>
      )}
      <div className="groups-setup">
        {groups.map((g) => (
          <div className="gs-card" key={g.id}>
            <div className="gs-head"><span className="group-badge">{g.id}</span> Grupo {g.id} <span className="muted small">{g.playerIds.length}/{f.perGroup}</span></div>
            {g.playerIds.map((pid, i) => (
              <div className={`gs-row ${pid === state.cafe ? 'is-cafe' : ''}`} key={pid}>
                <PlayerTag id={pid} size={18} />
                {i === 0 ? <span className="seed-star">★</span>
                  : pid === state.cafe ? <span className="cafe-badge" title="Café com leite">☕</span>
                  : <button className="icon-btn small" onClick={() => removeFrom(g.id, pid)}>✕</button>}
              </div>
            ))}
            {Array.from({ length: f.perGroup - g.playerIds.length }).map((_, i) => (
              <div className="gs-row empty" key={`e${i}`}>Vaga livre</div>
            ))}
          </div>
        ))}
      </div>
      {free.length === 0 && <button className="btn ghost small" onClick={clear}>Limpar grupos</button>}
      {state.format === 10 && free.length === 0 && <Matchups groups={groups} />}
    </div>
  )
}

function matchupsValid(groups, matchups) {
  return groups.every((g) => {
    const list = matchups[g.id] || defaultGroupMatchups(g.playerIds)
    const count = Object.fromEntries(g.playerIds.map((id) => [id, 0]))
    const seen = new Set()
    for (const [h, a] of list) {
      if (!h || !a || h === a) return false
      const k = [h, a].sort().join('|')
      if (seen.has(k)) return false
      seen.add(k)
      count[h]++
      count[a]++
    }
    return Object.values(count).every((c) => c === 2)
  })
}

function Matchups({ groups }) {
  const { state, update } = useStore()
  const name = (id) => state.players.find((p) => p.id === id)?.name
  const set = (gid, i, side, val) => update((s) => {
    const g = s.groups.find((x) => x.id === gid)
    const list = s.groupMatchups[gid] || defaultGroupMatchups(g.playerIds)
    list[i][side] = val
    s.groupMatchups[gid] = list
  })
  const valid = matchupsValid(groups, state.groupMatchups)
  return (
    <div className="info-box">
      <div className="info-title">Confrontos da fase de grupos</div>
      <p className="muted small" style={{ marginTop: 0 }}>
        No formato de 10, cada jogador faz 2 jogos dentro do grupo. Já sugerimos uma tabela em ciclo; ajuste se vocês definiram outros confrontos.
      </p>
      <div className="matchups">
        {groups.map((g) => {
          const list = state.groupMatchups[g.id] || defaultGroupMatchups(g.playerIds)
          return (
            <div key={g.id} className="mu-group">
              <div className="gs-head"><span className="group-badge">{g.id}</span> Grupo {g.id}</div>
              {list.map(([h, a], i) => (
                <div className="mu-row" key={i}>
                  <span className="muted small">J{i + 1}</span>
                  <select value={h} onChange={(e) => set(g.id, i, 0, e.target.value)}>
                    {g.playerIds.map((id) => <option key={id} value={id}>{name(id)}</option>)}
                  </select>
                  <span className="muted">×</span>
                  <select value={a} onChange={(e) => set(g.id, i, 1, e.target.value)}>
                    {g.playerIds.map((id) => <option key={id} value={id}>{name(id)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {!valid && <div className="warn small">Cada jogador precisa ter exatamente 2 jogos, sem confronto repetido.</div>}
    </div>
  )
}

function StepReview() {
  const { state } = useStore()
  const groups = state.groups
  const total = buildGroupMatches(groups, state.format === 10 ? state.groupMatchups : null, state.cafe).length
  return (
    <div className="setup-step">
      <div className="review-hero">
        <div className="rh-title">{state.name || 'Campeonato PES'}</div>
        <div className="muted">{FORMATS[state.format].title} · {total} jogos na fase de grupos</div>
      </div>
      <div className="groups-setup">
        {groups.map((g) => (
          <div className="gs-card" key={g.id}>
            <div className="gs-head"><span className="group-badge">{g.id}</span> Grupo {g.id}</div>
            {g.playerIds.map((pid, i) => (
              <div className={`gs-row ${pid === state.cafe ? 'is-cafe' : ''}`} key={pid}>
                <PlayerTag id={pid} size={18} />
                {i === 0 && <span className="seed-star">★</span>}
                {pid === state.cafe && <span className="cafe-badge">☕</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="info-box"><div className="info-title">Regras</div><FormatInfo format={state.format} /></div>
    </div>
  )
}

export function Setup() {
  const { state, update } = useStore()
  const step = state.setupStep || 0
  const f = FORMATS[state.format]

  const playersOk = f && state.players.length === f.size && state.players.every((p) => p.name.trim() && p.team)
  const namesUnique = playersOk && new Set(state.players.map((p) => p.name.trim().toLowerCase())).size === f.size
  const seedsOk = f && state.seeds.length === f.groups && (!f.cafe || (state.cafe && !state.seeds.includes(state.cafe)))
  const groupsOk = f && state.groups.length === f.groups && state.groups.every((g) => g.playerIds.length === f.perGroup)
    && (state.format !== 10 || matchupsValid(state.groups, state.groupMatchups))

  const canNext = [!!f, playersOk && namesUnique, seedsOk, groupsOk, true][step]
  const hint = [
    'Escolha um formato.',
    f && state.players.length > f.size ? `Remova ${state.players.length - f.size} jogador(es) para ficar com ${f.size}.`
      : !playersOk ? 'Preencha nome e seleção de todos.' : !namesUnique ? 'Há nomes repetidos.' : '',
    state.seeds.length !== f?.groups ? `Selecione ${f?.groups} cabeças de chave.` : 'Escolha o café com leite.',
    'Complete todos os grupos.',
    '',
  ][step]

  const go = (d) => update((s) => { s.setupStep = Math.max(0, Math.min(STEPS.length - 1, step + d)) })
  const start = () => {
    window.location.hash = 'home'
    window.scrollTo({ top: 0 })
    doStart()
  }
  const doStart = () => update((s) => {
    s.players.forEach((p) => { p.name = p.name.trim() })
    s.groupMatches = buildGroupMatches(s.groups, s.format === 10 ? s.groupMatchups : null, FORMATS[s.format].cafe ? s.cafe : null)
    s.results = {}
    s.overrides = {}
    s.status = 'running'
    s.startedAt = Date.now()
  })

  return (
    <div className="setup">
      <div className="setup-head">
        <div className="brand big"><span className="brand-ball">⚽</span> Novo campeonato</div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <button
              key={s}
              className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => i < step && update((st) => { st.setupStep = i })}
            >
              <span className="step-n">{i < step ? '✓' : i + 1}</span>
              <span className="step-l">{s}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card setup-card">
        <h2 className="setup-title">{STEPS[step]}</h2>
        {step === 0 && <StepFormat />}
        {step === 1 && <StepPlayers />}
        {step === 2 && <StepSeeds />}
        {step === 3 && <StepGroups />}
        {step === 4 && <StepReview />}
        <div className="setup-nav">
          <button className="btn ghost" onClick={() => go(-1)} disabled={step === 0}>Voltar</button>
          <span className="muted small">{!canNext && hint}</span>
          {step < STEPS.length - 1 ? (
            <button className="btn primary" disabled={!canNext} onClick={() => go(1)}>Continuar</button>
          ) : (
            <button className="btn primary big" onClick={start}>Começar campeonato 🏁</button>
          )}
        </div>
      </div>
    </div>
  )
}
