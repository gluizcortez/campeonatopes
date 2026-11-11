import { useEffect, useState } from 'react'
import { useStore } from './store.jsx'
import { Setup } from './components/Setup.jsx'
import { ResultModal } from './components/Match.jsx'
import { BracketPage, Groups, Home, Matches, PatoPage, Players, ScorersPage, Settings } from './pages.jsx'
import { FORMATS } from './logic/tournament.js'

const PRIMARY = ['home', 'matches', 'groups', 'bracket']

const TABS = [
  { id: 'home', label: 'Início', icon: '🏠' },
  { id: 'matches', label: 'Partidas', icon: '📅' },
  { id: 'groups', label: 'Grupos', icon: '🟢' },
  { id: 'bracket', label: 'Chaves', icon: '⚔️' },
  { id: 'scorers', label: 'Artilharia', icon: '👟' },
  { id: 'pato', label: 'Pato', icon: '🦆' },
  { id: 'players', label: 'Jogadores', icon: '👥' },
  { id: 'settings', label: 'Ajustes', icon: '⚙️' },
]

function readTab() {
  const h = window.location.hash.replace('#', '')
  return TABS.some((t) => t.id === h) ? h : 'home'
}

export default function App() {
  const { state, tournament } = useStore()
  const [tab, setTab] = useState(readTab)
  const [openId, setOpenId] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    const onHash = () => setTab(readTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.querySelector('.tab.active')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [tab, state.status])

  const goTo = (id) => {
    window.location.hash = id
    setTab(id)
    setMoreOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (state.status !== 'running' || !tournament) {
    return (
      <div className="app">
        <Setup />
      </div>
    )
  }

  const open = (m) => setOpenId(m.id)
  const openMatch = openId ? tournament.matches.find((m) => m.id === openId) : null
  const props = { open, goTo }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-ball">⚽</span>
            <div>
              <div className="brand-name">{state.name || 'Campeonato PES'}</div>
              <div className="brand-sub">{FORMATS[state.format].title}</div>
            </div>
          </div>
          <nav className="tabs" aria-label="Seções">
            {TABS.map((t) => (
              <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => goTo(t.id)}>
                <span className="tab-icon">{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="content" key={tab}>
        {tab === 'home' && <Home {...props} />}
        {tab === 'matches' && <Matches {...props} />}
        {tab === 'groups' && <Groups {...props} />}
        {tab === 'bracket' && <BracketPage {...props} />}
        {tab === 'scorers' && <ScorersPage {...props} />}
        {tab === 'pato' && <PatoPage {...props} />}
        {tab === 'players' && <Players {...props} />}
        {tab === 'settings' && <Settings {...props} />}
      </main>
      <nav className="bottom-nav" aria-label="Navegação">
        {TABS.filter((t) => PRIMARY.includes(t.id)).map((t) => (
          <button key={t.id} className={`bn-item ${tab === t.id ? 'active' : ''}`} onClick={() => goTo(t.id)}>
            <span className="bn-icon">{t.icon}</span>
            <span className="bn-label">{t.label}</span>
          </button>
        ))}
        <button className={`bn-item ${!PRIMARY.includes(tab) || moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen((v) => !v)}>
          <span className="bn-icon">{moreOpen ? '✕' : '☰'}</span>
          <span className="bn-label">{PRIMARY.includes(tab) ? 'Mais' : TABS.find((t) => t.id === tab).label}</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={(e) => e.stopPropagation()}>
            {TABS.filter((t) => !PRIMARY.includes(t.id)).map((t) => (
              <button key={t.id} className={`ms-item ${tab === t.id ? 'active' : ''}`} onClick={() => goTo(t.id)}>
                <span className="ms-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {openMatch && <ResultModal key={openMatch.id} match={openMatch} onClose={() => setOpenId(null)} />}
    </div>
  )
}
