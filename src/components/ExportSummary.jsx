import { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import { Modal } from './common.jsx'
import { computeSummary } from '../logic/summary.js'
import { renderSummaryPng } from '../logic/summaryImage.js'

function fileName(name) {
  const slug = (name || 'campeonato').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'campeonato'
  return `${slug}-resumo.png`
}

// Botão "Exportar resumo" (só aparece com o campeonato encerrado) + prévia com baixar / compartilhar
export function ExportSummaryButton({ className = 'btn primary' }) {
  const { state, tournament: t } = useStore()
  const [open, setOpen] = useState(false)
  const [img, setImg] = useState(null) // { blob, url, file }
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    let alive = true
    let url = null
    setImg(null)
    setErr('')
    renderSummaryPng(computeSummary(state, t))
      .then((blob) => {
        if (!alive) return
        url = URL.createObjectURL(blob)
        setImg({ blob, url, file: new File([blob], fileName(state.name), { type: 'image/png' }) })
      })
      .catch(() => alive && setErr('Não foi possível gerar a imagem neste navegador.'))
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, state, t])

  if (!t?.finished) return null

  const canShare = !!img && typeof navigator.canShare === 'function' && navigator.canShare({ files: [img.file] })

  const download = () => {
    const a = document.createElement('a')
    a.href = img.url
    a.download = img.file.name
    a.click()
  }
  const share = async () => {
    try {
      await navigator.share({ files: [img.file], title: state.name || 'Campeonato PES' })
    } catch (e) {
      if (e?.name !== 'AbortError') download()
    }
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>📸 Exportar resumo (PNG)</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Resumo do campeonato" wide>
        <div className="summary-preview">
          {img ? <img src={img.url} alt="Resumo do campeonato" /> : <div className="muted small">{err || 'Gerando imagem…'}</div>}
        </div>
        <div className="row-end">
          {canShare && <button className="btn ghost" onClick={share}>📤 Compartilhar</button>}
          <button className="btn primary" onClick={download} disabled={!img}>⬇️ Baixar PNG</button>
        </div>
      </Modal>
    </>
  )
}
