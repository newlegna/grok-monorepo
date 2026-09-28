import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { Highlight, Poem, Reading } from "@/lib/poem"
import { cn } from "@/lib/utils"

interface ReadingsPanelProps {
  poem: Poem
  bilingual: boolean
  highlight: Highlight
  onHighlight: (h: Highlight) => void
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${label}`)
  } catch {
    toast.error("Clipboard unavailable in this browser")
  }
}

function ReadingLine({
  reading,
  index,
  kind,
  bilingual,
  active,
  onHighlight,
}: {
  reading: Reading
  index: number
  kind: "row" | "col"
  bilingual: boolean
  active: boolean
  onHighlight: (h: Highlight) => void
}) {
  const label = kind === "row" ? `横${index + 1}` : `竖${index + 1}`
  return (
    <li
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors",
        active ? "border-brand/40 bg-brand/10" : "hover:bg-accent/50",
      )}
      onMouseEnter={() => onHighlight({ kind, index })}
      onMouseLeave={() => onHighlight(null)}
    >
      <span className={cn("mt-1 shrink-0 font-mono text-[10px] tracking-widest", active ? "text-brand" : "text-muted-foreground/50")}>
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-poem text-lg tracking-[0.35em]", active && "text-brand")}>{reading.zh}</p>
        {bilingual && <p className="mt-0.5 text-sm italic text-muted-foreground">{reading.en}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Copy ${label} reading`}
        onClick={() => copyText(bilingual ? `${reading.zh} — ${reading.en}` : reading.zh, label)}
      >
        <Copy />
      </Button>
    </li>
  )
}

export function ReadingsPanel({ poem, bilingual, highlight, onHighlight }: ReadingsPanelProps) {
  const isActive = (kind: "row" | "col", index: number) => {
    if (!highlight) return false
    if (highlight.kind === kind) return highlight.index === index
    if (highlight.kind === "cell") return kind === "row" ? highlight.row === index : highlight.col === index
    return false
  }

  const section = (kind: "row" | "col", title: string, sub: string, readings: Reading[]) => (
    <section>
      <div className="mb-2 flex items-baseline gap-2 px-3">
        <h3 className="font-poem text-base text-foreground/80">{title}</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">{sub}</span>
      </div>
      <ul className="space-y-0.5">
        {readings.map((r, i) => (
          <ReadingLine
            key={`${kind}-${i}`}
            reading={r}
            index={i}
            kind={kind}
            bilingual={bilingual}
            active={isActive(kind, i)}
            onHighlight={onHighlight}
          />
        ))}
      </ul>
    </section>
  )

  return (
    <div className="space-y-6">
      {section("row", "横读", "horizontal · left to right", poem.horizontal)}
      {section("col", "竖读", "vertical · top to bottom", poem.vertical)}
    </div>
  )
}
