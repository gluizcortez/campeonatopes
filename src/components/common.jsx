import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TEAM_BY_ID } from '../data/teams.js'
import { usePlayer } from '../store.jsx'

export function Flag({ team, size = 28, className = '' }) {
  const t = TEAM_BY_ID[team]
  if (!t) return <span className={`flag flag-empty ${className}`} style={{ width: size * 1.4, height: size }} />
  return (
    <img
      className={`flag ${className}`}
      src={`/flags/${t.code}.png`}
      alt={t.name}
      title={t.name}
      style={{ width: size * 1.4, height: size }}
      loading="lazy"
    />
  )
}

export function PlayerTag({ id, placeholder = 'A definir', size = 22, showTeam = true, className = '' }) {
  const p = usePlayer(id)
  if (!p) {
    return (
      <span className={`player-tag tbd ${className}`}>
        <span className="flag flag-empty" style={{ width: size * 1.4, height: size }} />
        <span className="pt-text"><span className="pt-name">{placeholder}</span></span>
      </span>
    )
  }
  return (
    <span className={`player-tag ${className}`}>
      <Flag team={p.team} size={size} />
      <span className="pt-text">
        <span className="pt-name">{p.name}</span>
        {showTeam && <span className="pt-team">{TEAM_BY_ID[p.team]?.name}</span>}
      </span>
    </span>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  // Portal no body: evita que containers com backdrop-filter "prendam" o position: fixed
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({ open, title, message, confirmLabel = 'Confirmar', danger, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="muted" style={{ marginTop: 0 }}>{message}</p>
      <div className="row-end">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}

export function Card({ title, icon, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          <h2>{icon && <span className="card-icon">{icon}</span>}{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Empty({ icon = '⚽', children }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div>{children}</div>
    </div>
  )
}

export function Stepper({ value, onChange, min = 0, big }) {
  return (
    <div className={`stepper ${big ? 'big' : ''}`}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Diminuir">−</button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          onChange(Number.isNaN(n) ? 0 : Math.min(99, n))
        }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" onClick={() => onChange(Math.min(99, value + 1))} aria-label="Aumentar">+</button>
    </div>
  )
}
