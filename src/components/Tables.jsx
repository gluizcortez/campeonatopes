import { useStore } from '../store.jsx'
import { Flag, PlayerTag } from './common.jsx'
import { TEAM_BY_ID } from '../data/teams.js'
import { FORMATS } from '../logic/tournament.js'

function qualifyCut(format) {
  return format === 10 ? 3 : 2
}

export function GroupTable({ groupId, compact }) {
  const { state, tournament: t } = useStore()
  const rows = t.groupTables[groupId] || []
  const cut = qualifyCut(state.format)
  const seeds = new Set(state.seeds)
  return (
    <div className={`gtable ${compact ? 'compact' : ''}`}>
      <div className="gtable-title">
        <span className="group-badge">{groupId}</span> Grupo {groupId}
      </div>
      {t.cafe && t.cafeGroup && t.cafeGroup !== groupId && rows.some((r) => r.playerId === t.cafe) && (
        <div className="cafe-note">☕ O café com leite conta no Grupo {t.cafeGroup}. Aqui ele não ocupa vaga.</div>
      )}
      <table>
        <thead>
          <tr>
            <th className="pos">#</th>
            <th className="left">Jogador</th>
            <th title="Pontos">P</th>
            <th title="Jogos">J</th>
            <th title="Vitórias">V</th>
            {!compact && <th className="hide-sm" title="Empates">E</th>}
            {!compact && <th className="hide-sm" title="Derrotas">D</th>}
            {!compact && <th title="Gols pró">GP</th>}
            {!compact && <th title="Gols contra">GC</th>}
            <th title="Saldo de gols">SG</th>
            {!compact && <th className="hide-sm">Forma</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const q = t.qualified.has(r.playerId) && t.phase1Done
            const isCafe = r.playerId === t.cafe
            // índice na tabela que vale para classificação (café com leite só conta em um grupo)
            const i = (t.realTables[groupId] || rows).findIndex((x) => x.playerId === r.playerId)
            const ignored = i < 0
            const zone = ignored ? 'cafe' : i < cut ? 'q' : FORMATS[state.format].ko === 'quarters' && i === 2 ? 'maybe' : 'out'
            return (
              <tr key={r.playerId} className={`zone-${zone} ${q ? 'qualified' : ''}`}>
                <td className="pos"><span className="pos-dot" title={ignored ? `Não conta aqui: conta no Grupo ${t.cafeGroup}` : undefined}>{ignored ? '–' : i + 1}</span></td>
                <td className="left">
                  <div className="gt-player">
                    <PlayerTag id={r.playerId} size={18} showTeam={!compact} />
                    {seeds.has(r.playerId) && <span className="seed-star" title="Cabeça de chave">★</span>}
                    {isCafe && <span className="cafe-badge" title="Café com leite">☕</span>}
                  </div>
                </td>
                <td className="pts">{r.pts}</td>
                <td>{r.j}</td>
                <td>{r.v}</td>
                {!compact && <td className="hide-sm">{r.e}</td>}
                {!compact && <td className="hide-sm">{r.d}</td>}
                {!compact && <td>{r.gp}</td>}
                {!compact && <td>{r.gc}</td>}
                <td className={r.sg > 0 ? 'pos-num' : r.sg < 0 ? 'neg-num' : ''}>{r.sg > 0 ? `+${r.sg}` : r.sg}</td>
                {!compact && (
                  <td className="hide-sm">
                    <span className="form">{r.form.map((f, k) => <i key={k} className={`f-${f}`}>{f}</i>)}</span>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Legend() {
  const { state } = useStore()
  return (
    <div className="legend">
      <span><i className="lg q" /> Classificado</span>
      {FORMATS[state.format].ko === 'quarters' && <span><i className="lg maybe" /> Briga entre os melhores 3º</span>}
      {FORMATS[state.format].cafe && <span>☕ Café com leite (conta só no grupo em que foi melhor)</span>}
      <span><i className="lg out" /> Fora (briga do pato)</span>
      <span>★ Cabeça de chave</span>
      <span className="muted">Desempate: pontos, vitórias, saldo, gols pró</span>
    </div>
  )
}

export function ThirdsTable() {
  const { tournament: t } = useStore()
  if (!t.thirdsRanking.length) return null
  return (
    <div className="mini-rank">
      {t.thirdsRanking.map((id, i) => {
        const row = Object.values(t.groupTables).flat().find((r) => r.playerId === id)
        return (
          <div key={id} className={`mr-row ${i < 2 ? 'ok' : 'bad'}`}>
            <span className="mr-pos">{i + 1}º</span>
            <PlayerTag id={id} size={18} />
            <span className="mr-group">Gr. {t.groupPos[id]?.group}</span>
            <span className="mr-stat">{row.pts} {row.pts === 1 ? 'pt' : 'pts'} · {row.v} V · SG {row.sg}</span>
          </div>
        )
      })}
    </div>
  )
}

export function RepescagemTable() {
  const { tournament: t } = useStore()
  const rp = t.repescagem
  if (!rp) return null
  if (!rp.table.length) return <div className="muted small">Aguardando os perdedores do mata-mata.</div>
  return (
    <div className="mini-rank">
      {rp.table.map((r, i) => (
        <div key={r.playerId} className={`mr-row ${i === 0 ? 'ok' : ''}`}>
          <span className="mr-pos">{i + 1}º</span>
          <PlayerTag id={r.playerId} size={18} />
          <span className="mr-stat">{r.pts} {r.pts === 1 ? 'pt' : 'pts'} · {r.j} J · {r.v} V · SG {r.sg}</span>
        </div>
      ))}
    </div>
  )
}

export function PatoRanking() {
  const { state, tournament: t } = useStore()
  const statsMap = Object.fromEntries(Object.values(t.realTables).flat().map((r) => [r.playerId, r]))
  const list = t.patoCandidates
  const n = list.length
  return (
    <div className="mini-rank">
      {list.map((id, i) => {
        const r = statsMap[id]
        const danger = i >= n - 2
        return (
          <div key={id} className={`mr-row ${danger ? 'pato' : ''}`}>
            <span className="mr-pos">{state.players.length - n + i + 1}º</span>
            <PlayerTag id={id} size={18} />
            <span className="mr-group">Gr. {t.groupPos[id]?.group}{id === t.cafe ? ' ☕' : ''}</span>
            <span className="mr-stat">{r.pts} {r.pts === 1 ? 'pt' : 'pts'} · {r.v} V · SG {r.sg}</span>
            {danger && <span className="duck">🦆</span>}
          </div>
        )
      })}
      {!t.phase1Done && <div className="muted small" style={{ marginTop: 8 }}>Parcial: definido ao fim da fase de grupos.</div>}
    </div>
  )
}

export function Scorers({ list, limit }) {
  const shown = limit ? list.slice(0, limit) : list
  if (!list.length) return <div className="muted small">Nenhum gol com autor registrado ainda.</div>
  let lastGoals = null
  let lastRank = 0
  return (
    <div className="scorers-table">
      {shown.map((s, i) => {
        const rank = s.goals === lastGoals ? lastRank : i + 1
        lastGoals = s.goals
        lastRank = rank
        return (
          <div key={s.key} className={`st-row rank-${rank}`}>
            <span className="st-rank">{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}º`}</span>
            <Flag team={s.team} size={18} />
            <span className="st-name">
              {s.name}
              <small>{TEAM_BY_ID[s.team]?.name} · <PlayerName id={s.playerId} /></small>
            </span>
            <span className="st-goals">{s.goals}<small> gol{s.goals > 1 ? 's' : ''}</small></span>
          </div>
        )
      })}
    </div>
  )
}

function PlayerName({ id }) {
  const { state } = useStore()
  return state.players.find((p) => p.id === id)?.name || ''
}

export function FormatInfo({ format }) {
  const f = FORMATS[format]
  if (!f) return null
  return (
    <ol className="format-steps">
      {f.steps.map((s, i) => <li key={i}>{s}</li>)}
      <li>Pato 🦆: os 2 piores que caíram na fase de grupos se enfrentam. Quem perder é o pato.</li>
    </ol>
  )
}
