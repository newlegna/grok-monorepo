import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { renderPoster, type PosterText } from '@/lib/poster'

const EXAMPLES = [
  { src: '/examples/1.jpg', title: 'Cafe Pause' },
  { src: '/examples/2.jpg', title: 'Blue Bicycle' },
  { src: '/examples/3.jpg', title: 'Orange Ride' },
  { src: '/examples/4.jpg', title: 'Simit Cart' },
]

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image.'))
    img.src = url
  })
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [hasPhoto, setHasPhoto] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [text, setText] = useState<PosterText | null>(null)
  const [error, setError] = useState<string | null>(null)

  const acceptFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image — drop a photo (JPG, PNG, WebP…).')
      return
    }
    setError(null)
    setRendering(true)
    try {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      imageRef.current = await loadImage(url)
      setHasPhoto(true)
      setSeed(Math.floor(Math.random() * 1e9))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that image.')
      setRendering(false)
    }
  }, [])

  // Re-render the poster whenever the photo or seed changes.
  useEffect(() => {
    if (!hasPhoto || !imageRef.current || !canvasRef.current) return
    let cancelled = false
    setRendering(true)
    renderPoster(canvasRef.current, imageRef.current, seed)
      .then((t) => {
        if (!cancelled) setText(t)
      })
      .catch(() => {
        if (!cancelled) setError('Poster rendering failed. Try another photo.')
      })
      .finally(() => {
        if (!cancelled) setRendering(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasPhoto, seed])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) void acceptFile(file)
    },
    [acceptFile],
  )

  const download = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const slug = text ? text.title.toLowerCase().replace(/\s+/g, '-') : 'poster'
      a.download = `photo-doodle-${slug}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/png')
  }, [text])

  const reset = useCallback(() => {
    setHasPhoto(false)
    setText(null)
    setError(null)
    imageRef.current = null
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  return (
    <div
      className="min-h-screen bg-[#f5efe3] text-[#453a2e]"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void acceptFile(file)
          e.target.value = ''
        }}
      />

      <header className="mx-auto flex max-w-5xl items-baseline justify-between px-6 pt-10 pb-6">
        <div>
          <h1 className="font-[Archivo] text-xl font-bold tracking-[0.22em]">
            PHOTO DOODLE · TRAVEL OBJECT
          </h1>
          <p className="mt-1 font-hand text-lg text-[#6b5d4d]">
            照片涂鸦旅行物件 — one photo in, one paper-doodle poster out.
          </p>
        </div>
        {hasPhoto && (
          <Button variant="ghost" onClick={reset}>
            New photo
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        {error && (
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        {!hasPhoto ? (
          <>
            <Card
              className={`cursor-pointer border-2 border-dashed bg-[#fbf7ee] transition-colors ${
                dragging ? 'border-[#453a2e] bg-[#f1e9d8]' : 'border-[#c9bda6]'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="font-hand text-4xl">Drop a travel photo here</span>
                <span className="text-sm text-[#6b5d4d]">
                  or click to browse — it becomes a 3:4 editorial poster: your photo on top, a
                  paper-doodle of one object below. Everything stays in your browser.
                </span>
                <Button className="mt-2" size="lg">
                  Choose a photo
                </Button>
              </CardContent>
            </Card>

            <section className="mt-12">
              <h2 className="font-[Archivo] text-sm font-semibold tracking-[0.28em] text-[#6b5d4d]">
                THE RECIPE — FOUR REFERENCE POSTERS
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {EXAMPLES.map((ex) => (
                  <figure key={ex.src} className="overflow-hidden rounded-lg shadow-md">
                    <img
                      src={ex.src}
                      alt={`Example poster: ${ex.title}`}
                      className="aspect-[3/4] w-full object-cover transition-transform hover:scale-[1.02]"
                    />
                    <figcaption className="bg-[#fbf7ee] px-3 py-2 font-hand text-lg">
                      {ex.title}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-start gap-8 lg:flex-row">
            <div className="relative mx-auto w-full max-w-xl">
              <canvas
                ref={canvasRef}
                className="aspect-[3/4] w-full rounded-md shadow-xl"
                aria-label="Generated travel-object poster"
              />
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-[#f5efe3]/70">
                  <span className="font-hand text-3xl">doodling…</span>
                </div>
              )}
            </div>

            <aside className="w-full lg:w-64">
              <h2 className="font-[Archivo] text-sm font-semibold tracking-[0.28em] text-[#6b5d4d]">
                POSTER
              </h2>
              {text && (
                <p className="mt-3 font-hand text-3xl leading-tight">{text.title}</p>
              )}
              {text && <p className="mt-1 font-hand text-xl text-[#6b5d4d]">{text.note}</p>}
              <div className="mt-6 flex flex-col gap-3">
                <Button onClick={() => setSeed(Math.floor(Math.random() * 1e9))} disabled={rendering}>
                  Reshuffle doodles
                </Button>
                <Button variant="secondary" onClick={download} disabled={rendering}>
                  Download PNG
                </Button>
              </div>
              <p className="mt-6 text-xs leading-relaxed text-[#6b5d4d]">
                The doodle panel is generated locally: palette sampled from your photo, one
                center-weighted object region sliced as paper cut-outs, marker strokes and a short
                observation written from what the pixels actually show.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
