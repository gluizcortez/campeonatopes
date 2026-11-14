// Desenha o resumo do campeonato num <canvas> e devolve um PNG (Blob).
// Feito à mão com Canvas 2D para não precisar de biblioteca e funcionar igual no celular.
import { STAGES } from './tournament.js'
import { TEAM_BY_ID } from '../data/teams.js'

const W = 1080
const PAD = 56
const INNER = W - PAD * 2

const C = {
  bg: '#070b14',
  card: '#111a2c',
  card2: '#172238',
  line: 'rgba(148,163,184,0.18)',
  text: '#e8eef9',
  muted: '#8a97ad',
  green: '#22c55e',
  gold: '#fbbf24',
  silver: '#cbd5e1',
  pato: '#facc15',
  red: '#f87171',
}

const COND = "'Barlow Condensed', 'Arial Narrow', sans-serif"
const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"

const font = (size, weight = 600, family = SANS) => `${weight} ${size}px ${family}`
const fmt1 = (n) => n.toFixed(1).replace('.', ',')

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function box(ctx, x, y, w, h, { fill = C.card, stroke = C.line, r = 28 } = {}) {
  rr(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = 2
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function grad(ctx, x, y, w, h, from, to) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  return g
}

// Texto que encolhe (e, no limite, corta com …) para caber na largura
function text(ctx, str, x, y, { size = 28, weight = 600, family = SANS, color = C.text, align = 'left', max, upper, spacing } = {}) {
  str = String(str ?? '')
  if (upper) str = str.toUpperCase()
  let s = size
  ctx.font = font(s, weight, family)
  if (max) {
    while (s > size * 0.7 && ctx.measureText(str).width > max) ctx.font = font(--s, weight, family)
    if (ctx.measureText(str).width > max) {
      while (str.length > 1 && ctx.measureText(str + '…').width > max) str = str.slice(0, -1)
      str += '…'
    }
  }
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  if (spacing) ctx.letterSpacing = `${spacing}px`
  ctx.fillText(str, x, y)
  if (spacing) ctx.letterSpacing = '0px'
  return ctx.measureText(str).width
}

function emoji(ctx, e, x, y, size, align = 'center') {
  ctx.font = `${size}px ${EMOJI}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = C.text
  ctx.fillText(e, x, y)
}

// Bandeira na proporção 1,4 (igual ao app), cortando o excesso
function flag(ctx, imgs, teamId, x, y, h) {
  const w = h * 1.4
  const img = imgs[teamId]
  ctx.save()
  rr(ctx, x, y, w, h, Math.max(4, h * 0.14))
  ctx.clip()
  if (img) {
    const scale = Math.max(w / img.width, h / img.height)
    const iw = img.width * scale
    const ih = img.height * scale
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
  } else {
    ctx.fillStyle = C.card2
    ctx.fillRect(x, y, w, h)
  }
  ctx.restore()
  rr(ctx, x, y, w, h, Math.max(4, h * 0.14))
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.stroke()
  return w
}

function sectionTitle(ctx, icon, label, y) {
  emoji(ctx, icon, PAD + 16, y, 30)
  text(ctx, label, PAD + 44, y + 11, { size: 32, weight: 800, family: COND, upper: true, spacing: 1.5 })
  return y + 34
}

const teamName = (p) => TEAM_BY_ID[p?.team]?.name || ''
const scoreStr = (m) => {
  const r = m.result
  const pens = r.ph != null && r.pa != null && r.hg === r.ag
  return { home: `${r.hg}`, away: `${r.ag}`, pens: pens ? `pênaltis ${r.ph} × ${r.pa}` : '' }
}

function drawAll(ctx, s, imgs) {
  const P = s.players
  let y = 0

  // fundo
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, ctx.canvas.height)
  const glow = (cx, cy, r, color) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, ctx.canvas.height)
  }
  glow(120, 0, 900, 'rgba(34,197,94,0.16)')
  glow(W, 300, 800, 'rgba(96,165,250,0.12)')
  glow(W / 2, 520, 600, 'rgba(251,191,36,0.10)')

  // ---------- Cabeçalho ----------
  y = 64
  rr(ctx, PAD, y, 64, 64, 18)
  ctx.fillStyle = grad(ctx, PAD, y, 64, 64, C.green, '#0ea5e9')
  ctx.fill()
  emoji(ctx, '⚽', PAD + 32, y + 34, 38)
  text(ctx, s.name, PAD + 84, y + 40, { size: 50, weight: 800, family: COND, upper: true, max: INNER - 84, spacing: 1 })
  const sub = [`${Object.keys(P).length} participantes`, 'Campeonato encerrado']
  if (s.endedAt) sub.push(new Date(s.endedAt).toLocaleDateString('pt-BR'))
  text(ctx, sub.join(' · '), PAD + 84, y + 72, { size: 24, weight: 500, color: C.muted, max: INNER - 84 })
  y += 116

  // ---------- Campeão ----------
  if (s.champion) {
    const h = 400
    box(ctx, PAD, y, INNER, h, { fill: grad(ctx, PAD, y, INNER, h, 'rgba(251,191,36,0.30)', 'rgba(251,191,36,0.04)'), stroke: 'rgba(251,191,36,0.55)', r: 36 })
    emoji(ctx, '🏆', W / 2, y + 82, 96)
    text(ctx, 'Campeão', W / 2, y + 172, { size: 34, weight: 800, family: COND, color: C.gold, align: 'center', upper: true, spacing: 4 })
    // bandeira + nome centralizados
    ctx.font = font(64, 800, COND)
    const nameW = Math.min(ctx.measureText(s.champion.name).width, INNER - 220)
    const fh = 64
    const total = fh * 1.4 + 24 + nameW
    const fx = W / 2 - total / 2
    flag(ctx, imgs, s.champion.team, fx, y + 196, fh)
    text(ctx, s.champion.name, fx + fh * 1.4 + 24, y + 250, { size: 64, weight: 800, family: COND, max: INNER - 220 })
    text(ctx, teamName(s.champion), W / 2, y + 300, { size: 26, weight: 500, color: C.muted, align: 'center' })
    const cs = s.championStats
    if (cs) {
      const items = [[cs.j, 'jogos'], [cs.v, 'vitórias'], [cs.e, 'empates'], [cs.d, 'derrotas'], [cs.gp, 'gols pró'], [cs.gc, 'sofridos']]
      const cw = (INNER - 60) / items.length
      items.forEach(([n, l], i) => {
        const cx = PAD + 30 + cw * i + cw / 2
        text(ctx, n, cx, y + 352, { size: 38, weight: 800, family: COND, align: 'center' })
        text(ctx, l, cx, y + 380, { size: 19, weight: 500, color: C.muted, align: 'center' })
      })
    }
    y += h + 20
  }

  // ---------- Vice e Pato ----------
  const half = (INNER - 20) / 2
  const podCard = (x, p, icon, label, color, fill) => {
    const h = 210
    box(ctx, x, y, half, h, { fill, stroke: C.line, r: 30 })
    emoji(ctx, icon, x + half / 2, y + 52, 56)
    text(ctx, label, x + half / 2, y + 116, { size: 26, weight: 800, family: COND, color, align: 'center', upper: true, spacing: 2 })
    if (!p) return
    ctx.font = font(40, 800, COND)
    const nw = Math.min(ctx.measureText(p.name).width, half - 120)
    const fx = x + half / 2 - (36 * 1.4 + 16 + nw) / 2
    flag(ctx, imgs, p.team, fx, y + 132, 36)
    text(ctx, p.name, fx + 36 * 1.4 + 16, y + 164, { size: 40, weight: 800, family: COND, max: half - 120 })
    text(ctx, teamName(p), x + half / 2, y + 194, { size: 21, weight: 500, color: C.muted, align: 'center' })
  }
  if (s.vice || s.pato) {
    podCard(PAD, s.vice, '🥈', 'Vice', C.silver, C.card)
    podCard(PAD + half + 20, s.pato, '🦆', 'Pato do campeonato', C.pato, grad(ctx, PAD + half, y, half, 210, 'rgba(250,204,21,0.16)', 'rgba(250,204,21,0.02)'))
    y += 210 + 44
  }

  // ---------- Jogos decisivos ----------
  const matchRow = (m, label, accent) => {
    const h = 150
    box(ctx, PAD, y, INNER, h, { fill: C.card, r: 26 })
    rr(ctx, PAD, y, 8, h, [26, 0, 0, 26])
    ctx.fillStyle = accent
    ctx.fill()
    text(ctx, label, W / 2, y + 36, { size: 22, weight: 800, family: COND, color: accent, align: 'center', upper: true, spacing: 2 })
    const sc = scoreStr(m)
    const home = P[m.homeId]
    const away = P[m.awayId]
    const cy = y + 92
    // placar no centro
    text(ctx, `${sc.home}  ×  ${sc.away}`, W / 2, cy + 18, { size: 60, weight: 800, family: COND, align: 'center' })
    if (sc.pens) text(ctx, sc.pens, W / 2, cy + 46, { size: 19, weight: 600, color: C.muted, align: 'center' })
    const side = INNER / 2 - 120
    // mandante: nome à direita da bandeira, alinhado à esquerda
    flag(ctx, imgs, home?.team, PAD + 30, cy - 20, 40)
    text(ctx, home?.name, PAD + 30 + 56 + 14, cy + 4, { size: 34, weight: 800, family: COND, max: side - 90 })
    text(ctx, teamName(home), PAD + 30 + 56 + 14, cy + 30, { size: 19, weight: 500, color: C.muted, max: side - 90 })
    flag(ctx, imgs, away?.team, W - PAD - 30 - 56, cy - 20, 40)
    text(ctx, away?.name, W - PAD - 30 - 56 - 14, cy + 4, { size: 34, weight: 800, family: COND, align: 'right', max: side - 90 })
    text(ctx, teamName(away), W - PAD - 30 - 56 - 14, cy + 30, { size: 19, weight: 500, color: C.muted, align: 'right', max: side - 90 })
    y += h + 16
  }
  if (s.final?.result || s.patoMatch?.result) {
    y = sectionTitle(ctx, '⚔️', 'Jogos decisivos', y)
    if (s.final?.result) matchRow(s.final, '🏆 Final', C.gold)
    if (s.patoMatch?.result) matchRow(s.patoMatch, '🦆 Disputa do pato', C.pato)
    y += 28
  }

  // ---------- Números ----------
  y = sectionTitle(ctx, '📊', 'Números', y)
  const tiles = [[s.totalMatches, 'jogos'], [s.totalGoals, 'gols'], [fmt1(s.avgGoals), 'gols por jogo']]
  const tw = (INNER - 32) / 3
  tiles.forEach(([n, l], i) => {
    const x = PAD + i * (tw + 16)
    box(ctx, x, y, tw, 130, { fill: C.card, r: 24 })
    text(ctx, n, x + tw / 2, y + 74, { size: 64, weight: 800, family: COND, align: 'center', color: i === 1 ? C.green : C.text })
    text(ctx, l, x + tw / 2, y + 108, { size: 21, weight: 500, color: C.muted, align: 'center' })
  })
  y += 130 + 16

  // destaques 2x2
  const highlights = []
  if (s.topScorers.length) {
    const top = s.topScorers[0]
    const more = s.topScorers.length - 1
    highlights.push({
      icon: '👟', label: 'Artilheiro', team: top.team,
      main: more ? `${top.name} +${more}` : top.name,
      sub: `${top.goals} ${top.goals === 1 ? 'gol' : 'gols'} · ${P[top.playerId]?.name || ''}`,
    })
  }
  if (s.attack) {
    const p = P[s.attack.playerId]
    highlights.push({ icon: '🔥', label: 'Melhor ataque', team: p.team, main: p.name, sub: `${fmt1(s.attack.gp / s.attack.j)} gols por jogo (${s.attack.gp} em ${s.attack.j})` })
  }
  if (s.defense) {
    const p = P[s.defense.playerId]
    highlights.push({ icon: '🧱', label: 'Melhor defesa', team: p.team, main: p.name, sub: `${fmt1(s.defense.gc / s.defense.j)} sofridos por jogo (${s.defense.gc} em ${s.defense.j})` })
  }
  const bigLabel = (m) => {
    const homeWon = m.result.hg > m.result.ag
    const w = P[homeWon ? m.homeId : m.awayId]
    const l = P[homeWon ? m.awayId : m.homeId]
    return { w, l, score: `${Math.max(m.result.hg, m.result.ag)} × ${Math.min(m.result.hg, m.result.ag)}` }
  }
  if (s.biggestWin) {
    const b = bigLabel(s.biggestWin)
    highlights.push({ icon: '💥', label: 'Maior goleada', team: b.w?.team, main: `${b.w?.name} ${b.score}`, sub: `em ${b.l?.name} · ${STAGES[s.biggestWin.stage]}` })
  } else if (s.mostGoals) {
    const m = s.mostGoals
    highlights.push({ icon: '💥', label: 'Jogo com mais gols', team: P[m.homeId]?.team, main: `${m.result.hg} × ${m.result.ag}`, sub: `${P[m.homeId]?.name} × ${P[m.awayId]?.name}` })
  }
  highlights.forEach((hl, i) => {
    const x = PAD + (i % 2) * (half + 20)
    const yy = y + Math.floor(i / 2) * (156 + 16)
    box(ctx, x, yy, half, 156, { fill: C.card, r: 24 })
    emoji(ctx, hl.icon, x + 40, yy + 40, 28)
    text(ctx, hl.label, x + 66, yy + 50, { size: 24, weight: 800, family: COND, color: C.muted, upper: true, spacing: 1.5 })
    const fw = hl.team ? flag(ctx, imgs, hl.team, x + 26, yy + 74, 30) + 14 : 0
    text(ctx, hl.main, x + 26 + fw, yy + 100, { size: 34, weight: 800, family: COND, max: half - 52 - fw })
    text(ctx, hl.sub, x + 26, yy + 136, { size: 20, weight: 500, color: C.muted, max: half - 52 })
  })
  y += Math.ceil(highlights.length / 2) * (156 + 16) + 28

  // ---------- Artilharia ----------
  if (s.scorers.length) {
    y = sectionTitle(ctx, '👟', 'Artilharia', y)
    const rowH = 64
    const h = s.scorers.length * rowH + 20
    box(ctx, PAD, y, INNER, h, { fill: C.card, r: 24 })
    s.scorers.forEach((sc, i) => {
      const ry = y + 10 + i * rowH
      if (i) {
        ctx.fillStyle = C.line
        ctx.fillRect(PAD + 24, ry, INNER - 48, 1.5)
      }
      text(ctx, `${i + 1}º`, PAD + 34, ry + 42, { size: 28, weight: 800, family: COND, color: i === 0 ? C.gold : C.muted })
      flag(ctx, imgs, sc.team, PAD + 86, ry + 17, 30)
      const nw = text(ctx, sc.name, PAD + 86 + 42 + 14, ry + 42, { size: 30, weight: 800, family: COND, max: INNER - 400 })
      text(ctx, `${TEAM_BY_ID[sc.team]?.name || ''} · ${P[sc.playerId]?.name || ''}`, PAD + 142 + nw + 14, ry + 41, { size: 20, weight: 500, color: C.muted, max: INNER - 300 - nw })
      text(ctx, `${sc.goals}`, W - PAD - 84, ry + 44, { size: 36, weight: 800, family: COND, align: 'right' })
      text(ctx, sc.goals === 1 ? 'gol' : 'gols', W - PAD - 30, ry + 42, { size: 20, weight: 500, color: C.muted, align: 'right' })
    })
    y += h + 44
  }

  // ---------- Campanhas ----------
  y = sectionTitle(ctx, '📋', 'Campanha de cada um', y)
  const rowH = 58
  const cols = ['J', 'V', 'E', 'D', 'GP', 'GC', 'SG']
  const colW = 54
  const colX = (i) => W - PAD - 30 - (cols.length - 1 - i) * colW
  const h = 56 + s.standings.length * rowH + 10
  box(ctx, PAD, y, INNER, h, { fill: C.card, r: 24 })
  cols.forEach((c, i) => text(ctx, c, colX(i), y + 40, { size: 20, weight: 700, color: C.muted, align: 'right' }))
  text(ctx, 'Jogador', PAD + 86, y + 40, { size: 20, weight: 700, color: C.muted })
  const toneColor = { gold: C.gold, silver: C.silver, pato: C.pato, neutral: C.muted }
  s.standings.forEach((r, i) => {
    const ry = y + 56 + i * rowH
    if (r.tag.tone === 'gold') {
      rr(ctx, PAD + 10, ry + 2, INNER - 20, rowH - 4, 14)
      ctx.fillStyle = 'rgba(251,191,36,0.10)'
      ctx.fill()
    } else if (i) {
      ctx.fillStyle = C.line
      ctx.fillRect(PAD + 24, ry, INNER - 48, 1.5)
    }
    if (r.tag.icon) emoji(ctx, r.tag.icon, PAD + 46, ry + rowH / 2 + 1, 26)
    else text(ctx, `${i + 1}º`, PAD + 46, ry + 38, { size: 24, weight: 700, family: COND, color: C.muted, align: 'center' })
    flag(ctx, imgs, r.player.team, PAD + 86, ry + 15, 28)
    const nameMax = colX(0) - colW - (PAD + 132) - 150
    const nw = text(ctx, r.player.name, PAD + 132, ry + 39, { size: 28, weight: 800, family: COND, max: nameMax })
    text(ctx, r.tag.label, PAD + 132 + nw + 12, ry + 38, { size: 18, weight: 600, color: toneColor[r.tag.tone], max: colX(0) - colW - (PAD + 132 + nw + 12) })
    const vals = [r.j, r.v, r.e, r.d, r.gp, r.gc, r.sg > 0 ? `+${r.sg}` : r.sg]
    vals.forEach((v, k) => text(ctx, v, colX(k), ry + 38, {
      size: 24, weight: k === 1 ? 800 : 600, align: 'right',
      color: k === 6 ? (r.sg > 0 ? C.green : r.sg < 0 ? C.red : C.muted) : C.text,
    }))
  })
  y += h + 40

  // ---------- Rodapé ----------
  text(ctx, '⚽  Campeonato PES', W / 2, y + 10, { size: 22, weight: 600, color: C.muted, align: 'center' })
  return y + 56
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function renderSummaryPng(summary) {
  // garante que as fontes do app estão carregadas antes de desenhar
  try {
    await Promise.all([
      document.fonts.load(font(64, 800, "'Barlow Condensed'")),
      document.fonts.load(font(28, 500, 'Inter')),
      document.fonts.load(font(28, 800, 'Inter')),
    ])
  } catch { /* segue com a fonte do sistema */ }
  const teams = [...new Set(Object.values(summary.players).map((p) => p.team).filter(Boolean))]
  const imgs = {}
  await Promise.all(teams.map(async (id) => {
    const t = TEAM_BY_ID[id]
    if (t) imgs[id] = await loadImage(`/flags/${t.code}.png`)
  }))

  // 1ª passada mede a altura, a 2ª desenha no tamanho exato
  const probe = document.createElement('canvas')
  probe.width = W
  probe.height = 4000
  const height = Math.ceil(drawAll(probe.getContext('2d'), summary, imgs))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = height
  drawAll(canvas.getContext('2d'), summary, imgs)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'))
}
