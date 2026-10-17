export type FrameKey = 'permen' | 'langit' | 'mint' | 'mono'

export interface Frame {
  name: string
  bg: string // warna latar strip
  text: string // warna judul dan keterangan
  accent: string // garis kecil di bawah judul
  border: string // bingkai tiap foto
  gray: boolean // true = foto diubah jadi hitam putih
}

export const FRAMES: Record<FrameKey, Frame> = {
  permen: { name: 'Permen', bg: '#FFC8DD', text: '#4A2545', accent: '#A2D2FF', border: '#FFFFFF', gray: false },
  langit: { name: 'Langit', bg: '#BDE0FE', text: '#2B3A67', accent: '#FFC8DD', border: '#FFFFFF', gray: false },
  mint: { name: 'Mint', bg: '#B8F2E6', text: '#1F4D45', accent: '#CDB4DB', border: '#FFFFFF', gray: false },
  mono: { name: 'Hitam putih', bg: '#E9E7F0', text: '#2B2A33', accent: '#2B2A33', border: '#FFFFFF', gray: true },
}

interface StripOptions {
  frame: Frame
  shots: HTMLCanvasElement[]
  count: number
  title: string
  caption: string
}

const W = 640
const PAD = 36
const PHOTO_W = W - PAD * 2 // 568
const PHOTO_H = Math.round((PHOTO_W * 3) / 4) // 426, rasio 4:3
const GAP = 20
const HEAD_H = 104
const FOOT_H = 116

// Kecilkan font sedikit demi sedikit sampai teks muat di lebar yang tersedia
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight: number,
  minSize: number,
) {
  let size = startSize
  while (size > minSize) {
    ctx.font = `${weight} ${size}px sans-serif`
    if (ctx.measureText(text).width <= maxWidth) return
    size -= 2
  }
  ctx.font = `${weight} ${minSize}px sans-serif`
}

// Ubah piksel di area tertentu menjadi abu-abu
function toGrayscale(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const img = ctx.getImageData(x, y, w, h)
  const p = img.data // urutan: R, G, B, A, R, G, B, A, ...
  for (let i = 0; i < p.length; i += 4) {
    const v = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11
    p[i] = p[i + 1] = p[i + 2] = v
  }
  ctx.putImageData(img, x, y)
}

export function renderStrip(
  canvas: HTMLCanvasElement,
  { frame, shots, count, title, caption }: StripOptions,
) {
  const H = PAD + HEAD_H + count * PHOTO_H + (count - 1) * GAP + FOOT_H + PAD
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Latar
  ctx.fillStyle = frame.bg
  ctx.fillRect(0, 0, W, H)

  // Judul (otomatis mengecil kalau panjang)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = frame.text
  fitText(ctx, title.trim() || 'Nama acara', PHOTO_W, 52, 800, 22)
  ctx.fillText(title.trim() || 'Nama acara', W / 2, PAD + HEAD_H / 2 - 6)
  ctx.fillStyle = frame.accent
  ctx.fillRect(W / 2 - 36, PAD + HEAD_H - 12, 72, 6)

  // Foto
  for (let i = 0; i < count; i++) {
    const y = PAD + HEAD_H + i * (PHOTO_H + GAP)

    ctx.fillStyle = frame.border
    ctx.fillRect(PAD - 6, y - 6, PHOTO_W + 12, PHOTO_H + 12)

    const shot = shots[i]
    if (shot) {
      ctx.drawImage(shot, PAD, y, PHOTO_W, PHOTO_H)
      if (frame.gray) toGrayscale(ctx, PAD, y, PHOTO_W, PHOTO_H)
    } else {
      // Slot kosong: latar yang sedikit lebih gelap/terang + nomor
      ctx.fillStyle = frame.bg
      ctx.fillRect(PAD, y, PHOTO_W, PHOTO_H)
      ctx.globalAlpha = 0.15
      ctx.fillStyle = frame.text
      ctx.fillRect(PAD, y, PHOTO_W, PHOTO_H)
      ctx.globalAlpha = 0.7
      ctx.font = '700 28px sans-serif'
      ctx.fillText(`Foto ${i + 1}`, W / 2, y + PHOTO_H / 2)
      ctx.globalAlpha = 1
    }
  }

  // Keterangan bawah
  const text = caption.trim()
  if (text) {
    const footY = PAD + HEAD_H + count * PHOTO_H + (count - 1) * GAP
    ctx.fillStyle = frame.text
    fitText(ctx, text, PHOTO_W, 30, 700, 16)
    ctx.fillText(text, W / 2, footY + FOOT_H / 2)
  }
}
