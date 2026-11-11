import { Fragment } from 'react'
import { useStore } from '../store.jsx'
import { PlayerTag } from './common.jsx'
import { RepescagemTable } from './Tables.jsx'
import { FORMATS } from '../logic/tournament.js'

function BMatch({ m, onOpen }) {
  const { tournament: t } = useStore()
  const r = m.result
  const w = t.outcomes[m.id]?.winner
  const pens = r && r.hg === r.ag && r.ph != null
  const ready = m.homeId && m.awayId
  const sides = [
    { id: m.homeId, label: m.homeLabel, g: r?.hg, p: pens ? r.ph : null },
    { id: m.awayId, label: m.awayLabel, g: r?.ag, p: pens ? r.pa : null },
  ]
  return (
    <button className={`bm ${r ? 'played' : ''} ${ready ? '' : 'locked'} stage-${m.stage}`} onClick={() => ready && onOpen?.(m)} disabled={!ready}>
      <div className="bm-label">{m.subtitle}</div>
      {sides.map((s, i) => (
        <div key={i} className={`bm-side ${r && w === s.id ? 'win' : r ? 'lose' : ''}`}>
          <PlayerTag id={s.id} placeholder={s.label} size={16} showTeam={false} />
          <span className="bm-score">{s.g ?? ''}{s.p != null && <small> ({s.p})</small>}</span>
        </div>
      ))}
    </button>
  )
}

export function Bracket({ onOpen, compact }) {
  const { state, tournament: t } = useStore()
  const by = (stage) => t.matches.filter((m) => m.stage === stage)
  const final = by('final')[0]
  const champion = t.champion

  const kind = FORMATS[state.format].ko
  const cols = kind === 'semis'
    ? [{ title: 'Semifinais', items: by('semi') }]
    : kind === 'quarters'
    ? [
        { title: 'Quartas', items: by('quarter') },
        { title: 'Semifinais', items: by('semi') },
      ]
    : [
        { title: 'Mata-mata', items: by('second') },
        { title: 'Semifinais', items: by('semi') },
      ]

  return (
    <div className={`bracket ${compact ? 'compact' : ''}`}>
      {cols.map((c, ci) => (
        <Fragment key={c.title}>
        {ci === 1 && FORMATS[state.format].repescagem && !compact && (
          <div className="b-col b-rep">
            <div className="b-col-title">Repescagem 🔁</div>
            <div className="b-col-items">
              <RepescagemTable />
              {by('repescagem').map((m) => <BMatch key={m.id} m={m} onOpen={onOpen} />)}
            </div>
          </div>
        )}
        <div className="b-col">
          <div className="b-col-title">{c.title}</div>
          <div className="b-col-items">
            {c.items.map((m) => <BMatch key={m.id} m={m} onOpen={onOpen} />)}
          </div>
        </div>
        </Fragment>
      ))}
      <div className="b-col">
        <div className="b-col-title">Final 🏆</div>
        <div className="b-col-items">
          <BMatch m={final} onOpen={onOpen} />
          <div className={`trophy ${champion ? 'won' : ''}`}>
            <div className="trophy-icon">🏆</div>
            {champion ? <PlayerTag id={champion} size={20} /> : <span className="muted small">Campeão</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
