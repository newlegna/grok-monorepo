import { useState } from "react"
import { Copy, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { PoemGrid } from "@/components/PoemGrid"
import { ReadingsPanel } from "@/components/ReadingsPanel"
import {
  DEFAULT_MOCK,
  generatePoem,
  gridToText,
  NoApiKeyError,
  pickMockPoem,
  type Highlight,
  type Poem,
  type PoemSource,
} from "@/lib/poem"

export default function App() {
  const [theme, setTheme] = useState("")
  const [size, setSize] = useState(5)
  const [poem, setPoem] = useState<Poem>(DEFAULT_MOCK)
  const [source, setSource] = useState<PoemSource>("mock")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bilingual, setBilingual] = useState(true)
  const [highlight, setHighlight] = useState<Highlight>(null)

  async function handleGenerate() {
    const trimmed = theme.trim()
    if (!trimmed) {
      toast.warning("Give the poem a theme first — e.g. 秋夜 or “mountain rain”")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await generatePoem(trimmed, size)
      setPoem(result.poem)
      setSource("model")
      toast.success(`Composed by ${result.model}`)
    } catch (err) {
      if (err instanceof NoApiKeyError) {
        const mock = pickMockPoem(trimmed, size)
        setPoem(mock)
        setSize(mock.grid.length)
        setSource("mock")
        toast.info("No OPENAI_API_KEY on the server — showing a hand-authored offline sample instead.")
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  async function copyGrid() {
    try {
      await navigator.clipboard.writeText(gridToText(poem.grid))
      toast.success("Copied the full grid")
    } catch {
      toast.error("Clipboard unavailable in this browser")
    }
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.28_0.03_50/0.35),transparent_60%)]" />
      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        {/* Header */}
        <header className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-[0.2em]">
              gpt-6-astra
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              single-user playground
            </Badge>
          </div>
          <h1 className="font-poem text-4xl sm:text-5xl">
            横竖 <span className="text-muted-foreground/70">Hengshu</span>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            A Hengshu (横竖, “across-and-down”) poem is an omnidirectional grid of Chinese characters: every row is a
            line of verse read left to right, and every column is <em>also</em> a line read top to bottom. Set a theme,
            and GPT-6 Astra composes a grid under those constraints. Hover any row, column, or character to trace a
            reading path.
          </p>
        </header>

        {/* Controls */}
        <section className="mb-10 flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="min-w-56 flex-1">
            <Label htmlFor="theme" className="mb-1.5 text-xs text-muted-foreground">
              Theme · 主题
            </Label>
            <Input
              id="theme"
              placeholder="秋夜 · autumn night · mountain rain…"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">Grid</Label>
            <Select value={String(size)} onValueChange={(v) => setSize(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} × {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="min-w-32">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "Composing…" : "Generate"}
          </Button>
          <div className="flex h-8 items-center gap-2 pl-1">
            <Switch id="bilingual" checked={bilingual} onCheckedChange={setBilingual} />
            <Label htmlFor="bilingual" className="text-xs text-muted-foreground">
              EN gloss
            </Label>
          </div>
        </section>

        {error && (
          <div className="mb-8 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Generation failed: {error}
            <button
              type="button"
              className="ml-3 underline underline-offset-2 hover:opacity-80"
              onClick={() => {
                setError(null)
                const mock = pickMockPoem(theme, size)
                setPoem(mock)
                setSize(mock.grid.length)
                setSource("mock")
              }}
            >
              show offline sample
            </button>
          </div>
        )}

        {/* Poem */}
        <section className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h2 className="font-poem text-2xl">《{poem.title}》</h2>
            <Badge variant={source === "model" ? "default" : "secondary"} className="font-mono text-[10px] uppercase tracking-[0.2em]">
              {source === "model" ? "gpt-6-astra" : "offline sample"}
            </Badge>
            <Button variant="outline" size="sm" onClick={copyGrid}>
              <Copy /> Copy grid
            </Button>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
            <div className="flex items-start justify-center lg:justify-start">
              <PoemGrid poem={poem} highlight={highlight} onHighlight={setHighlight} />
            </div>
            <ReadingsPanel poem={poem} bilingual={bilingual} highlight={highlight} onHighlight={setHighlight} />
          </div>

          {poem.note && (
            <p className="mt-8 max-w-2xl border-l-2 border-brand/40 pl-3 text-xs leading-relaxed text-muted-foreground">
              {poem.note}
            </p>
          )}
        </section>

        <footer className="mt-14 border-t border-border/40 pt-5 text-xs text-muted-foreground/60">
          After Cheng Lou’s GPT-6 Astra Hengshu demo · offline sample lines after Du Fu 杜甫 and Wang Shifu 王实甫 ·
          key stays on the server, never in the browser.
        </footer>
      </main>
    </div>
  )
}
