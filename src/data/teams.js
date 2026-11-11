// Seleções disponíveis no campeonato. `code` é o nome do arquivo da bandeira em /public/flags.
export const TEAMS = [
  { id: 'espanha', name: 'Espanha', code: 'es', color: '#c60b1e' },
  { id: 'franca', name: 'França', code: 'fr', color: '#1e3a8a' },
  { id: 'inglaterra', name: 'Inglaterra', code: 'gb-eng', color: '#e5e7eb' },
  { id: 'portugal', name: 'Portugal', code: 'pt', color: '#b91c1c' },
  { id: 'alemanha', name: 'Alemanha', code: 'de', color: '#f5f5f5' },
  { id: 'argentina', name: 'Argentina', code: 'ar', color: '#74acdf' },
  { id: 'belgica', name: 'Bélgica', code: 'be', color: '#dc2626' },
  { id: 'brasil', name: 'Brasil', code: 'br', color: '#facc15' },
  { id: 'costa-do-marfim', name: 'Costa do Marfim', code: 'ci', color: '#f97316' },
  { id: 'croacia', name: 'Croácia', code: 'hr', color: '#ef4444' },
  { id: 'dinamarca', name: 'Dinamarca', code: 'dk', color: '#dc2626' },
  { id: 'equador', name: 'Equador', code: 'ec', color: '#facc15' },
  { id: 'holanda', name: 'Holanda', code: 'nl', color: '#f97316' },
  { id: 'italia', name: 'Itália', code: 'it', color: '#2563eb' },
  { id: 'marrocos', name: 'Marrocos', code: 'ma', color: '#b91c1c' },
  { id: 'nigeria', name: 'Nigéria', code: 'ng', color: '#16a34a' },
  { id: 'noruega', name: 'Noruega', code: 'no', color: '#dc2626' },
  { id: 'polonia', name: 'Polônia', code: 'pl', color: '#f43f5e' },
  { id: 'senegal', name: 'Senegal', code: 'sn', color: '#16a34a' },
  { id: 'suica', name: 'Suíça', code: 'ch', color: '#dc2626' },
  { id: 'turquia', name: 'Turquia', code: 'tr', color: '#dc2626' },
  { id: 'uruguai', name: 'Uruguai', code: 'uy', color: '#60a5fa' },
]

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]))
