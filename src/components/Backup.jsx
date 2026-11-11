import { useRef, useState } from 'react'
import { useStore } from '../store.jsx'
import { computeTournament, FORMATS } from '../logic/tournament.js'

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = (state.name || 'campeonato').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'campeonato'
  a.href = url
  a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ImportButton({ label = '📂 Importar backup' }) {
  const { replace } = useStore()
  const ref = useRef(null)
  const [err, setErr] = useState('')
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (data?.version !== 1 || !Array.isArray(data.players)) throw new Error('formato')
      // garante que o arquivo abre sem quebrar o site antes de substituir os dados atuais
      if (data.status === 'running' && !FORMATS[data.format]) throw new Error('formato')
      if (data.status === 'running') computeTournament({ results: {}, overrides: {}, groups: [], groupMatches: [], ...data })
      replace(data)
      setErr('')
    } catch {
      setErr('Arquivo inválido. Use um backup exportado por este site.')
    }
    e.target.value = ''
  }
  return (
    <>
      <button className="btn ghost small" onClick={() => ref.current?.click()}>{label}</button>
      <input ref={ref} type="file" accept="application/json,.json" hidden onChange={onFile} />
      {err && <div className="warn small">{err}</div>}
    </>
  )
}
