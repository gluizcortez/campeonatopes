import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Flag, Modal, PlayerTag, Stepper } from './common.jsx'
import { TEAM_BY_ID } from '../data/teams.js'
import { normalizeName } from '../logic/tournament.js'

const STAGE_ICON = { group: '🟢', second: '⚔️', quarter: '⚔️', repescagem: '🔁', semi: '🔥', final: '🏆', pato: '🦆' }

export function stageIcon(stage) {
  return STAGE_ICON[stage] || '⚽'
}

function Side({ id, label, score, pens, win, align }) {
  return (
    <div className={`ms-side ${align} ${win ? 'win' : ''}`}>
      <PlayerTag id={id} placeholder={label} />
      <div className="ms-score">
        {score != null ? score : '–'}
        {pens != null && <small>({pens})</small>}
      </div>
    </div>
  )
}

// Card compacto de partida, usado em listas
export function MatchCard({ match, onOpen }) {
  const r = match.result
  const { outcomes } = useStore().tournament
  const w = outcomes?.[match.id]?.winner
  const ready = match.homeId && match.awayId
  const hasPens = r && r.hg === r.ag && r.ph != null
  return (
    <button
      className={`match-card stage-${match.stage} ${r ? 'played' : ''} ${!ready ? 'locked' : ''}`}
      onClick={() => ready && onOpen?.(match)}
      disabled={!ready}
    >
      <div className="mc-top">
        <span className="mc-stage">{stageIcon(match.stage)} {match.title}</span>
        <span className="mc-sub">
          {match.subtitle}
        </span>
      </div>
      <div className="mc-body">
        <Side id={match.homeId} label={match.homeLabel} score={r?.hg} pens={hasPens ? r.ph : null} win={r && w === match.homeId} align="left" />
        <Side id={match.awayId} label={match.awayLabel} score={r?.ag} pens={hasPens ? r.pa : null} win={r && w === match.awayId} align="left" />
      </div>
      {match.staleResult && <div className="mc-warn">⚠️ Confronto mudou, resultado antigo ignorado</div>}
      {match.overridden && <div className="mc-note">✏️ Confronto ajustado manualmente</div>}
    </button>
  )
}

function suggestionsFor(state, teamId) {
  const names = new Map()
  for (const r of Object.values(state.results)) {
    for (const g of r.scorers || []) {
      const ownerId = g.side === 'home' ? r.homeId : r.awayId
      const owner = state.players.find((p) => p.id === ownerId)
      if (owner?.team === teamId && g.name?.trim()) names.set(normalizeName(g.name), g.name.trim())
    }
  }
  return [...names.values()].sort()
}

function ScorerInputs({ side, count, scorers, setScorers, teamId, listId }) {
  const { state } = useStore()
  const suggestions = useMemo(() => suggestionsFor(state, teamId), [state, teamId])
  const mine = scorers.filter((s) => s.side === side)
  const rows = Array.from({ length: count }, (_, i) => mine[i] || { side, name: '', ownGoal: false })
  const setRow = (i, patch) => {
    const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r))
    setScorers([...scorers.filter((s) => s.side !== side), ...next])
  }
  if (!count) return <div className="muted small">Sem gols</div>
  return (
    <div className="scorers">
      {rows.map((r, i) => (
        <div className="scorer-row" key={i}>
          <span className="ball">⚽</span>
          <input
            list={listId}
            placeholder={`Autor do ${i + 1}º gol`}
            value={r.name}
            onChange={(e) => setRow(i, { name: e.target.value })}
          />
          <label className={`og ${r.ownGoal ? 'on' : ''}`} title="Gol contra (não conta na artilharia)">
            <input type="checkbox" checked={!!r.ownGoal} onChange={(e) => setRow(i, { ownGoal: e.target.checked })} />
            GC
          </label>
        </div>
      ))}
      <datalist id={listId}>
        {suggestions.map((n) => <option key={n} value={n} />)}
      </datalist>
    </div>
  )
}

export function ResultModal({ match, onClose }) {
  const { state, update, tournament } = useStore()
  const existing = match?.result
  const [hg, setHg] = useState(existing?.hg ?? 0)
  const [ag, setAg] = useState(existing?.ag ?? 0)
  const [ph, setPh] = useState(existing?.ph ?? 0)
  const [pa, setPa] = useState(existing?.pa ?? 0)
  const [scorers, setScorers] = useState(existing?.scorers ?? [])
  const [editing, setEditing] = useState(false)
  const [ovHome, setOvHome] = useState(match?.homeId || '')
  const [ovAway, setOvAway] = useState(match?.awayId || '')

  const home = state.players.find((p) => p.id === match?.homeId)
  const away = state.players.find((p) => p.id === match?.awayId)
  const needPens = match?.knockout && hg === ag
  const pensInvalid = needPens && ph === pa
  const sorted = useMemo(() => state.players.slice().sort((a, b) => a.name.localeCompare(b.name)), [state.players])
  // Um jogador não pode estar em dois confrontos da mesma fase (exceto o triangular da repescagem).
  // Se escolherem alguém que já está em outro jogo da fase, os dois jogos trocam de jogador.
  const otherMatchOf = (id) => (match?.stage === 'repescagem' ? null : tournament?.matches.find(
    (m) => m.id !== match?.id && m.stage === match?.stage && (m.homeId === id || m.awayId === id),
  ))
  const swaps = [[match?.homeId, ovHome], [match?.awayId, ovAway]]
    .filter(([oldId, newId]) => newId && newId !== oldId && newId !== match?.homeId && newId !== match?.awayId)
    .map(([oldId, newId]) => ({ oldId, newId, other: otherMatchOf(newId) }))
    .filter((x) => x.other)
  const swapBlocked = swaps.filter((x) => x.other.result)
  const pname = (id) => state.players.find((p) => p.id === id)?.name
  // Se um jogo ajustado desta fase já foi jogado, voltar ao automático deixaria a troca pela metade
  const clearLocked = tournament?.matches.some((m) => m.stage === match?.stage && m.id !== match?.id && m.overridden && m.result)

  if (!match) return null

  const save = () => {
    update((s) => {
      s.results[match.id] = {
        homeId: match.homeId,
        awayId: match.awayId,
        hg, ag,
        ph: needPens ? ph : null,
        pa: needPens ? pa : null,
        scorers: scorers
          .filter((x) => (x.side === 'home' ? hg : ag) > 0)
          .filter((x, i, arr) => arr.filter((y) => y.side === x.side).indexOf(x) < (x.side === 'home' ? hg : ag))
          .map((x) => ({ side: x.side, name: (x.name || '').trim(), ownGoal: !!x.ownGoal })),
        // ao corrigir um placar, mantém o horário original (não muda a ordem dos últimos resultados)
        playedAt: existing?.playedAt || Date.now(),
      }
    })
    onClose()
  }

  const clear = () => {
    update((s) => { delete s.results[match.id] })
    onClose()
  }

  const saveOverride = () => {
    update((s) => {
      s.overrides[match.id] = { homeId: ovHome, awayId: ovAway }
      for (const { oldId, newId, other } of swaps) {
        const cur = s.overrides[other.id] || { homeId: other.homeId, awayId: other.awayId }
        s.overrides[other.id] = {
          homeId: cur.homeId === newId ? oldId : cur.homeId,
          awayId: cur.awayId === newId ? oldId : cur.awayId,
        }
      }
    })
    onClose()
  }
  const clearOverride = () => {
    // desfaz os ajustes de toda a fase, já que uma troca mexe em dois jogos
    const sameStage = tournament.matches.filter((m) => m.stage === match.stage && !m.result).map((m) => m.id)
    update((s) => { for (const id of sameStage) delete s.overrides[id] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`${stageIcon(match.stage)} ${match.title} · ${match.subtitle}`} wide>
      {editing ? (
        <div className="override">
          <p className="muted" style={{ marginTop: 0 }}>
            Ajuste quem joga este confronto. Use isso se vocês combinarem um chaveamento diferente do automático.
          </p>
          <div className="override-grid">
            <label>Mandante
              <select value={ovHome} onChange={(e) => setOvHome(e.target.value)}>
                {sorted.map((p) => <option key={p.id} value={p.id}>{p.name} ({TEAM_BY_ID[p.team]?.name})</option>)}
              </select>
            </label>
            <label>Visitante
              <select value={ovAway} onChange={(e) => setOvAway(e.target.value)}>
                {sorted.map((p) => <option key={p.id} value={p.id}>{p.name} ({TEAM_BY_ID[p.team]?.name})</option>)}
              </select>
            </label>
          </div>
          {swaps.map((x) => (
            <div key={x.newId} className={x.other.result ? 'warn small' : 'muted small'} style={{ marginTop: 8 }}>
              {x.other.result
                ? `${pname(x.newId)} já jogou outro jogo desta fase (${x.other.subtitle}) e não pode ser trocado.`
                : `🔁 ${pname(x.newId)} sai de ${x.other.subtitle} e ${pname(x.oldId)} entra no lugar dele.`}
            </div>
          ))}
          {match.overridden && clearLocked && (
            <div className="muted small" style={{ marginTop: 8 }}>
              Não dá para voltar ao automático: outro jogo ajustado desta fase já tem resultado.
            </div>
          )}
          <div className="row-end">
            {match.overridden && !clearLocked && <button className="btn ghost" onClick={clearOverride}>Voltar ao automático (fase inteira)</button>}
            <button className="btn ghost" onClick={() => setEditing(false)}>Cancelar</button>
            <button className="btn primary" disabled={!ovHome || !ovAway || ovHome === ovAway || swapBlocked.length > 0} onClick={saveOverride}>Salvar confronto</button>
          </div>
        </div>
      ) : (
        <>
          <div className="score-entry">
            <div className="se-team">
              <Flag team={home?.team} size={48} />
              <div className="se-name">{home?.name}</div>
              <div className="muted small">{TEAM_BY_ID[home?.team]?.name}</div>
              <Stepper value={hg} onChange={setHg} big />
            </div>
            <div className="se-x">×</div>
            <div className="se-team">
              <Flag team={away?.team} size={48} />
              <div className="se-name">{away?.name}</div>
              <div className="muted small">{TEAM_BY_ID[away?.team]?.name}</div>
              <Stepper value={ag} onChange={setAg} big />
            </div>
          </div>

          {needPens && (
            <div className="pens">
              <div className="pens-title">Empate no mata-mata · Pênaltis</div>
              <div className="pens-row">
                <Stepper value={ph} onChange={setPh} />
                <span className="muted">×</span>
                <Stepper value={pa} onChange={setPa} />
              </div>
              {pensInvalid && <div className="warn small">Os pênaltis precisam ter um vencedor.</div>}
            </div>
          )}

          {(hg > 0 || ag > 0) && (
            <div className="scorer-grid">
              <div>
                <div className="scorer-title"><Flag team={home?.team} size={14} /> Gols de {home?.name}</div>
                <ScorerInputs side="home" count={hg} scorers={scorers} setScorers={setScorers} teamId={home?.team} listId={`sug-home-${match.id}`} />
              </div>
              <div>
                <div className="scorer-title"><Flag team={away?.team} size={14} /> Gols de {away?.name}</div>
                <ScorerInputs side="away" count={ag} scorers={scorers} setScorers={setScorers} teamId={away?.team} listId={`sug-away-${match.id}`} />
              </div>
            </div>
          )}
          <p className="muted small">Os autores dos gols são opcionais, mas alimentam a artilharia. Marque GC para gol contra.</p>

          <div className="row-between">
            <div className="row">
              {match.knockout && !existing && (
                <button className="btn ghost" onClick={() => setEditing(true)}>✏️ Editar confronto</button>
              )}
            </div>
            <div className="row">
              {existing && <button className="btn danger ghost" onClick={clear}>Apagar resultado</button>}
              <button className="btn primary" onClick={save} disabled={pensInvalid}>Salvar resultado</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
