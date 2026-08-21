const COLORS = {
  charcoal: '#12161c',
  charcoalLight: '#1a2029',
  charcoalLighter: '#232a35',
  border: '#2a3240',
  win: '#3ecf6e',
  loss: '#e0554f',
  slate50: '#f8fafc',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export type ReviewCardTile = { label: string; value: string }
export type ReviewCardRow = { label: string; text: string; amount: string; positive: boolean }

export type ReviewCardOptions = {
  username: string
  title: string
  subtitle: string
  positive: boolean
  heroLabel: string
  heroValue: string
  tiles: ReviewCardTile[]
  rows: ReviewCardRow[]
  message: string
  footer: string
}

/** Dessine une carte de revue hebdomadaire (thème sportsbook) sur un canvas et retourne un PNG. */
export async function renderReviewCardImage(opts: ReviewCardOptions): Promise<Blob> {
  await document.fonts.ready

  const S = 2
  const W = 640
  const margin = 16
  const cardW = W - margin * 2
  const padding = 24
  const contentW = cardW - padding * 2

  // Hauteur calculée dynamiquement en fonction du contenu
  const tileRows = Math.ceil(opts.tiles.length / 2)
  const messageLineHeight = 20
  const canvasProbe = document.createElement('canvas').getContext('2d')!
  canvasProbe.font = '400 14px sans-serif'
  const messageLines = wrapText(canvasProbe, opts.message, contentW)

  const heroH = 96
  const tileH = 64
  const tileGap = 8
  const rowH = 56
  const rowGap = 8

  let contentH = 0
  if (opts.username) contentH += 34 // pseudo centré en haut
  contentH += 30 + 18 // title + subtitle
  contentH += 16 + heroH // gap + hero box
  contentH += 12 + tileRows * tileH + (tileRows - 1) * tileGap // tiles
  if (opts.rows.length > 0) {
    contentH += 16 + opts.rows.length * rowH + (opts.rows.length - 1) * rowGap
  }
  contentH += 16 + messageLines.length * messageLineHeight
  contentH += 28 // footer

  const cardH = padding * 2 + contentH
  const H = cardH + margin * 2

  const canvas = document.createElement('canvas')
  canvas.width = W * S
  canvas.height = H * S
  const ctx = canvas.getContext('2d')!
  ctx.scale(S, S)

  // Fond
  ctx.fillStyle = COLORS.charcoal
  ctx.fillRect(0, 0, W, H)

  // Carte
  const cardX = margin
  const cardY = margin
  roundRect(ctx, cardX, cardY, cardW, cardH, 16)
  ctx.fillStyle = COLORS.charcoalLight
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = COLORS.border
  ctx.stroke()

  // Accent du haut
  ctx.save()
  roundRect(ctx, cardX, cardY, cardW, 16, 16)
  ctx.clip()
  ctx.fillStyle = opts.positive ? COLORS.win : COLORS.loss
  ctx.fillRect(cardX, cardY, cardW, 4)
  ctx.restore()

  let x = cardX + padding
  let y = cardY + padding

  ctx.textBaseline = 'top'

  // Pseudo, centré en haut
  if (opts.username) {
    ctx.textAlign = 'center'
    ctx.fillStyle = COLORS.slate300
    ctx.font = '700 22px "JetBrains Mono", monospace'
    ctx.fillText(`@${opts.username}`, x + contentW / 2, y)
    ctx.textAlign = 'left'
    y += 34
  }

  // Titre
  ctx.fillStyle = COLORS.slate50
  ctx.font = '600 24px "Barlow Condensed", sans-serif'
  ctx.fillText(opts.title, x, y)
  y += 30

  ctx.fillStyle = COLORS.slate500
  ctx.font = '400 12px "JetBrains Mono", monospace'
  ctx.fillText(opts.subtitle, x, y)
  y += 18 + 16

  // Hero (profit net)
  roundRect(ctx, x, y, contentW, heroH, 12)
  ctx.fillStyle = hexToRgba(opts.positive ? COLORS.win : COLORS.loss, 0.1)
  ctx.fill()
  ctx.strokeStyle = hexToRgba(opts.positive ? COLORS.win : COLORS.loss, 0.3)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.slate400
  ctx.font = '400 11px "JetBrains Mono", monospace'
  ctx.fillText(opts.heroLabel.toUpperCase(), x + contentW / 2, y + 16)

  ctx.fillStyle = opts.positive ? COLORS.win : COLORS.loss
  ctx.font = '700 36px "JetBrains Mono", monospace'
  ctx.fillText(opts.heroValue, x + contentW / 2, y + 38)
  ctx.textAlign = 'left'
  y += heroH + 12

  // Tuiles de stats (2 par ligne)
  const tileW = (contentW - tileGap) / 2
  opts.tiles.forEach((tile, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const tx = x + col * (tileW + tileGap)
    const ty = y + row * (tileH + tileGap)
    roundRect(ctx, tx, ty, tileW, tileH, 8)
    ctx.fillStyle = COLORS.charcoalLighter
    ctx.fill()
    ctx.strokeStyle = COLORS.border
    ctx.stroke()

    ctx.fillStyle = COLORS.slate400
    ctx.font = '400 10px "JetBrains Mono", monospace'
    ctx.fillText(tile.label.toUpperCase(), tx + 12, ty + 12)

    ctx.fillStyle = COLORS.slate50
    ctx.font = '600 18px "JetBrains Mono", monospace'
    ctx.fillText(tile.value, tx + 12, ty + 30)
  })
  y += tileRows * tileH + (tileRows - 1) * tileGap

  // Meilleur / pire pari
  if (opts.rows.length > 0) {
    y += 16
    for (const row of opts.rows) {
      roundRect(ctx, x, y, contentW, rowH, 8)
      ctx.fillStyle = COLORS.charcoalLighter
      ctx.fill()
      ctx.strokeStyle = COLORS.border
      ctx.stroke()

      ctx.fillStyle = COLORS.slate400
      ctx.font = '400 10px "JetBrains Mono", monospace'
      ctx.fillText(row.label.toUpperCase(), x + 12, y + 10)

      ctx.fillStyle = COLORS.slate300
      ctx.font = '400 14px sans-serif'
      const maxTextWidth = contentW - 24 - ctx.measureText(row.amount).width - 100
      let text = row.text
      while (ctx.measureText(text).width > maxTextWidth && text.length > 3) {
        text = text.slice(0, -2)
      }
      if (text !== row.text) text += '…'
      ctx.fillText(text, x + 12, y + 28)

      ctx.textAlign = 'right'
      ctx.fillStyle = row.positive ? COLORS.win : COLORS.loss
      ctx.font = '600 14px "JetBrains Mono", monospace'
      ctx.fillText(row.amount, x + contentW - 12, y + 19)
      ctx.textAlign = 'left'

      y += rowH + rowGap
    }
    y -= rowGap
  }

  // Message contextuel
  y += 16
  ctx.fillStyle = COLORS.slate300
  ctx.font = '400 14px sans-serif'
  for (const line of messageLines) {
    ctx.fillText(line, x, y)
    y += messageLineHeight
  }

  // Footer
  y += 12
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.slate600
  ctx.font = '600 11px "Barlow Condensed", sans-serif'
  ctx.fillText(opts.footer.toUpperCase(), x + contentW / 2, y)
  ctx.textAlign = 'left'

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob a échoué'))), 'image/png')
  })
}
