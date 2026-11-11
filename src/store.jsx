import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { computeTournament } from './logic/tournament.js'

const KEY = 'campeonato-pes:v1'

export function initialState() {
  return {
    version: 1,
    status: 'setup',
    setupStep: 0,
    name: 'Campeonato PES',
    format: null,
    players: [],
    seeds: [],
    cafe: null,
    groups: [],
    groupMatchups: {},
    groupMatches: [],
    results: {},
    overrides: {},
    createdAt: Date.now(),
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    const data = JSON.parse(raw)
    if (!data || data.version !== 1) return initialState()
    return { ...initialState(), ...data }
  } catch {
    return initialState()
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const [savedAt, setSavedAt] = useState(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
      setSavedAt(Date.now())
    } catch {
      /* armazenamento indisponível */
    }
  }, [state])

  // update(fn): fn recebe uma cópia do estado e pode alterá-la diretamente
  const api = useMemo(() => ({
    update(fn) {
      setState((prev) => {
        const draft = structuredClone(prev)
        const res = fn(draft)
        return res || draft
      })
    },
    replace(next) { setState({ ...initialState(), ...next }) },
    reset() { setState(initialState()) },
  }), [])

  const tournament = useMemo(
    () => (state.status === 'running' ? computeTournament(state) : null),
    [state],
  )

  const value = useMemo(() => ({ state, tournament, savedAt, ...api }), [state, tournament, savedAt, api])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  return useContext(Ctx)
}

export function usePlayer(id) {
  const { state } = useStore()
  return state.players.find((p) => p.id === id) || null
}

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}
