import { Trash2, Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { blankQuestion, type EditableQuestion } from "@/lib/questions"

const TYPE_LABELS: Record<EditableQuestion["type"], string> = {
  choice: "choice",
  score: "score",
  noul: "noul (yes/no)",
}

interface QuestionEditorProps {
  question: EditableQuestion
  onChange: (question: EditableQuestion) => void
  onRemove: () => void
}

export function QuestionEditor({ question, onChange, onRemove }: QuestionEditorProps) {
  const changeType = (type: EditableQuestion["type"]) => {
    if (type === question.type) return
    const blank = blankQuestion(type)
    onChange({ ...blank, id: question.id, name: question.name, instructions: question.instructions })
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Input
          value={question.name}
          onChange={(e) => onChange({ ...question, name: e.target.value })}
          placeholder="answer_name"
          className="h-8 font-mono text-xs flex-1"
          aria-label="Question name"
        />
        <Select value={question.type} onValueChange={(v) => changeType(v as EditableQuestion["type"])}>
          <SelectTrigger className="h-8 w-32 text-xs" size="sm" aria-label="Question type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as EditableQuestion["type"][]).map((type) => (
              <SelectItem key={type} value={type} className="text-xs">
                {TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove} aria-label="Remove question">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Input
        value={question.instructions}
        onChange={(e) => onChange({ ...question, instructions: e.target.value })}
        placeholder="Instructions, e.g. What is this ticket about?"
        className="h-8 text-xs"
        aria-label="Question instructions"
      />

      {question.type === "choice" && (
        <div className="space-y-1.5">
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={option.label}
                onChange={(e) => {
                  const options = question.options.map((o, j) => (j === i ? { ...o, label: e.target.value } : o))
                  onChange({ ...question, options })
                }}
                placeholder="label"
                className="h-7 w-32 font-mono text-xs"
                aria-label={`Option ${i + 1} label`}
              />
              <Input
                value={option.description}
                onChange={(e) => {
                  const options = question.options.map((o, j) => (j === i ? { ...o, description: e.target.value } : o))
                  onChange({ ...question, options })
                }}
                placeholder="description (optional)"
                className="h-7 flex-1 text-xs"
                aria-label={`Option ${i + 1} description`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={question.options.length <= 2}
                onClick={() => onChange({ ...question, options: question.options.filter((_, j) => j !== i) })}
                aria-label={`Remove option ${i + 1}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange({ ...question, options: [...question.options, { label: "", description: "" }] })}
          >
            <Plus className="h-3 w-3" /> Option
          </Button>
        </div>
      )}

      {question.type === "score" && (
        <div className="space-y-1.5">
          {question.levels.map((level, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Badge variant="secondary" className="h-7 w-8 justify-center font-mono shrink-0">
                {i}
              </Badge>
              <Input
                value={level}
                onChange={(e) => {
                  const levels = question.levels.map((l, j) => (j === i ? e.target.value : l))
                  onChange({ ...question, levels })
                }}
                placeholder={`What does a score of ${i} mean?`}
                className="h-7 flex-1 text-xs"
                aria-label={`Score level ${i}`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={question.levels.length <= 2}
                onClick={() => onChange({ ...question, levels: question.levels.filter((_, j) => j !== i) })}
                aria-label={`Remove level ${i}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange({ ...question, levels: [...question.levels, ""] })}
          >
            <Plus className="h-3 w-3" /> Level
          </Button>
        </div>
      )}

      {question.type === "noul" && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="h-7 w-10 justify-center shrink-0">
              yes
            </Badge>
            <Input
              value={question.yes}
              onChange={(e) => onChange({ ...question, yes: e.target.value })}
              placeholder="Description of the yes outcome (optional)"
              className="h-7 flex-1 text-xs"
              aria-label="Yes outcome description"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="h-7 w-10 justify-center shrink-0">
              no
            </Badge>
            <Input
              value={question.no}
              onChange={(e) => onChange({ ...question, no: e.target.value })}
              placeholder="Description of the no outcome (optional)"
              className="h-7 flex-1 text-xs"
              aria-label="No outcome description"
            />
          </div>
        </div>
      )}
    </div>
  )
}
