import { Fragment } from "react"
import type { Highlight, Poem } from "@/lib/poem"
import { cn } from "@/lib/utils"

interface PoemGridProps {
  poem: Poem
  highlight: Highlight
  onHighlight: (h: Highlight) => void
}

function cellState(highlight: Highlight, row: number, col: number): "path" | "cross" | "dim" | "idle" {
  if (!highlight) return "idle"
  if (highlight.kind === "row") return highlight.index === row ? "path" : "dim"
  if (highlight.kind === "col") return highlight.index === col ? "path" : "dim"
  if (highlight.row === row && highlight.col === col) return "path"
  return highlight.row === row || highlight.col === col ? "cross" : "dim"
}

export function PoemGrid({ poem, highlight, onHighlight }: PoemGridProps) {
  const n = poem.grid.length

  return (
    <div
      className="inline-grid gap-1.5 sm:gap-2"
      style={{ gridTemplateColumns: `2rem repeat(${n}, minmax(0, 1fr))` }}
      onMouseLeave={() => onHighlight(null)}
      role="grid"
      aria-label={`${n} by ${n} Hengshu poem grid`}
    >
      {/* corner + column headers */}
      <div />
      {Array.from({ length: n }, (_, j) => (
        <button
          key={`ch-${j}`}
          type="button"
          className={cn(
            "flex h-7 items-center justify-center rounded-md font-mono text-[11px] tracking-widest text-muted-foreground/60 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-brand",
            highlight?.kind === "col" && highlight.index === j && "bg-brand/15 text-brand",
          )}
          onMouseEnter={() => onHighlight({ kind: "col", index: j })}
          onFocus={() => onHighlight({ kind: "col", index: j })}
          onBlur={() => onHighlight(null)}
          aria-label={`Highlight column ${j + 1}: ${poem.vertical[j]?.zh ?? ""}`}
        >
          竖{j + 1}↓
        </button>
      ))}

      {poem.grid.map((row, i) => (
        <Fragment key={`r-${i}`}>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-md font-mono text-[11px] tracking-widest text-muted-foreground/60 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-brand",
              highlight?.kind === "row" && highlight.index === i && "bg-brand/15 text-brand",
            )}
            onMouseEnter={() => onHighlight({ kind: "row", index: i })}
            onFocus={() => onHighlight({ kind: "row", index: i })}
            onBlur={() => onHighlight(null)}
            aria-label={`Highlight row ${i + 1}: ${poem.horizontal[i]?.zh ?? ""}`}
          >
            横{i + 1}→
          </button>
          {row.map((char, j) => {
            const state = cellState(highlight, i, j)
            return (
              <div
                key={`c-${i}-${j}`}
                role="gridcell"
                onMouseEnter={() => onHighlight({ kind: "cell", row: i, col: j })}
                className={cn(
                  "flex aspect-square select-none items-center justify-center rounded-lg border font-poem text-2xl sm:text-3xl md:text-4xl leading-none transition-all duration-150",
                  state === "idle" && "border-border/60 bg-card/60 text-foreground/90",
                  state === "path" && "scale-[1.04] border-brand/70 bg-brand/15 text-brand shadow-[0_0_24px_-6px] shadow-brand/40",
                  state === "cross" && "border-brand/30 bg-brand/[0.06] text-foreground",
                  state === "dim" && "border-border/40 bg-card/30 text-foreground/30",
                )}
              >
                {char}
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
