import { Badge } from "@/components/ui/badge"
import type { Answer } from "@/lib/api"

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function ProbabilityBar({ label, value, highlight }: { label: string; value: number; highlight: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-24 truncate font-mono ${highlight ? "font-semibold" : "text-muted-foreground"}`}>
        {label}
      </span>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${highlight ? "bg-primary" : "bg-muted-foreground/40"}`}
          style={{ width: percent(value) }}
        />
      </div>
      <span className="w-14 text-right tabular-nums text-muted-foreground">{percent(value)}</span>
    </div>
  )
}

export function AnswerCard({ name, answer }: { name: string; answer: Answer }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{name}</span>
        <Badge variant="outline" className="font-mono text-[10px]">
          {answer.type}
        </Badge>
      </div>

      {answer.type === "choice" && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono">{answer.choice}</span>
            <span className="text-xs text-muted-foreground">confidence {percent(answer.confidence)}</span>
          </div>
          <div className="space-y-1">
            {Object.entries(answer.probabilities)
              .sort(([, a], [, b]) => b - a)
              .map(([label, value]) => (
                <ProbabilityBar key={label} label={label} value={value} highlight={label === answer.choice} />
              ))}
          </div>
        </>
      )}

      {answer.type === "score" && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono">{answer.score.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">
              of {Object.keys(answer.probabilities).length - 1} · confidence {percent(answer.confidence)}
            </span>
          </div>
          <div className="space-y-1">
            {Object.entries(answer.probabilities).map(([level, value]) => (
              <ProbabilityBar
                key={level}
                label={level}
                value={value}
                highlight={Number(level) === Math.round(answer.score)}
              />
            ))}
          </div>
        </>
      )}

      {answer.type === "noul" && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono">{answer.noul >= 0.5 ? "yes" : "no"}</span>
            <span className="text-xs text-muted-foreground">P(yes) = {percent(answer.noul)}</span>
          </div>
          <div className="space-y-1">
            <ProbabilityBar label="yes" value={answer.noul} highlight={answer.noul >= 0.5} />
            <ProbabilityBar label="no" value={1 - answer.noul} highlight={answer.noul < 0.5} />
          </div>
        </>
      )}
    </div>
  )
}
