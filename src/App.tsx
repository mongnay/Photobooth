import { useEffect, useRef, useState } from 'react'
import { FRAMES, renderStrip, type FrameKey } from './strip'

const PHOTO_COUNT = 3
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const formatToday = () =>
  new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

// Ambil satu frame dari video: potong ke rasio 4:3, lalu balik horizontal (efek cermin)
function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const W = 800
  const H = 600
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const target = W / H
  let sw = video.videoWidth
  let sh = video.videoHeight
  let sx = 0
  let sy = 0
  if (sw / sh > target) {
    sw = sh * target
    sx = (video.videoWidth - sw) / 2
  } else {
    sh = sw / target
    sy = (video.videoHeight - sh) / 2
  }

  ctx.save()
  ctx.translate(W, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H)
  ctx.restore()
  return canvas
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stripRef = useRef<HTMLCanvasElement>(null)
  const alive = useRef(true)

  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [shots, setShots] = useState<HTMLCanvasElement[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [flashTick, setFlashTick] = useState(0) // BARU: naik 1 tiap jepretan untuk memicu kilatan

  const [frameKey, setFrameKey] = useState<FrameKey>('permen')
  const [title, setTitle] = useState('Sinta & Bima')
  const [caption, setCaption] = useState(formatToday)

  const done = shots.length === PHOTO_COUNT && !busy

  // Gambar ulang strip setiap foto atau pengaturan berubah
  useEffect(() => {
    if (!stripRef.current) return
    renderStrip(stripRef.current, {
      frame: FRAMES[frameKey],
      shots,
      count: PHOTO_COUNT,
      title,
      caption,
    })
  }, [shots, frameKey, title, caption])

  // Nyalakan kamera sekali saat komponen tampil, matikan saat komponen hilang
  useEffect(() => {
    alive.current = true
    let stream: MediaStream | null = null
    let cancelled = false

    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      } catch {
        setError('Kamera tidak bisa dibuka. Cek izin kamera di browser, lalu muat ulang halaman.')
      }
    }

    startCamera()
    return () => {
      alive.current = false
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function startSession() {
    const video = videoRef.current
    if (!video || busy) return
    setBusy(true)
    setShots([])

    for (let i = 0; i < PHOTO_COUNT; i++) {
      for (let c = 3; c >= 1; c--) {
        setCountdown(c)
        await wait(1000)
        if (!alive.current) return
      }
      setCountdown(null)

      setFlashTick((t) => t + 1)
      setShots((prev) => [...prev, captureFrame(video)])

      await wait(800)
      if (!alive.current) return
    }
    setBusy(false)
  }

  // Ubah isi canvas menjadi file PNG lalu picu unduhan
  function download() {
    const canvas = stripRef.current
    if (!canvas || !done) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `photobooth-${Date.now()}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  return (
    <main className="app">
      <header>
        <h1>Photobooth</h1>
        <p>Pilih frame, tekan Mulai foto, lalu unduh strip hasilnya.</p>
      </header>

      <div className="grid">
        <section aria-label="Kamera dan pengaturan">
          <div className="stage">
            <video
              ref={videoRef}
              onLoadedData={() => setReady(true)}
              autoPlay
              playsInline
              muted
            />
            {countdown !== null && (
              <div className="count" aria-hidden="true">
                {countdown}
              </div>
            )}
            <div key={flashTick} className={flashTick ? 'flash on' : 'flash'} />
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="actions">
            <button className="primary" onClick={startSession} disabled={!ready || busy}>
              {busy ? 'Sedang foto…' : shots.length ? 'Ulangi' : 'Mulai foto'}
            </button>
            <button className="secondary" onClick={download} disabled={!done}>
              Unduh strip
            </button>
          </div>

          <div className="panel">
            <h2>Pengaturan strip</h2>

            <div>
              <div className="group-label" id="frame-label">
                Frame
              </div>
              <div className="frames" role="group" aria-labelledby="frame-label">
                {(Object.keys(FRAMES) as FrameKey[]).map((key) => (
                  <button
                    key={key}
                    className="frame-chip"
                    onClick={() => setFrameKey(key)}
                    aria-pressed={key === frameKey}
                  >
                    <span
                      className="swatch"
                      style={{
                        background: FRAMES[key].bg,
                        borderBottom: `8px solid ${FRAMES[key].accent}`,
                      }}
                    />
                    {FRAMES[key].name}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Nama acara</span>
              <input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <label className="field">
              <span>Keterangan bawah</span>
              <input value={caption} maxLength={48} onChange={(e) => setCaption(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="strip-col" aria-label="Hasil strip">
          <div className="strip-wrap">
            <canvas ref={stripRef} className="strip" aria-label="Pratinjau strip foto" />
          </div>
        </section>
      </div>
    </main>
  )
}
