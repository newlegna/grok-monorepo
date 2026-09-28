import { useEffect, useMemo, useState } from "react"
import { Loader2, Play, Plus } from "lucide-react"
import { AnswerCard } from "@/components/answer-card"
import { QuestionEditor } from "@/components/question-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { fetchStatus, runSystemOne, type RunResponse } from "@/lib/api"
import { blankQuestion, PRESETS, toSdkQuestions, type EditableQuestion } from "@/lib/questions"

/** Parse the state blob as JSON when valid, otherwise pass it through as text. */
function parseState(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export default function App() {
  const [liveAvailable, setLiveAvailable] = useState<boolean | null>(null)
  const [forceMock, setForceMock] = useState(false)
  const [stateText, setStateText] = useState(PRESETS[0].state)
  const [questions, setQuestions] = useState<EditableQuestion[]>(PRESETS[0].questions)
  const [running, setRunning] = useState(false)
  const [response, setResponse] = useState<RunResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
      .then(({ live }) => setLiveAvailable(live))
      .catch(() => setLiveAvailable(false))
  }, [])

  const sdkQuestions = useMemo(() => toSdkQuestions(questions), [questions])
  const runnable = Object.keys(sdkQuestions).length > 0 && !running

  const mockMode = liveAvailable === false || forceMock

  const applyPreset = (key: string) => {
    const preset = PRESETS.find((p) => p.key === key)
    if (!preset) return
    setStateText(preset.state)
    setQuestions(preset.questions.map((q) => ({ ...q })))
    setResponse(null)
    setError(null)
  }

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      setResponse(await runSystemOne(parseState(stateText), sdkQuestions, forceMock))
    } catch (e) {
      setResponse(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Jev Playground</h1>
            <p className="text-xs text-muted-foreground">
              Typed decisions with TypeSafe System One via <span className="font-mono">@typesafe-ai/sdk</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {liveAvailable && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setForceMock((v) => !v)}>
                {forceMock ? "Use live API" : "Force dry run"}
              </Button>
            )}
            <Badge variant={mockMode ? "secondary" : "default"} className="uppercase tracking-wide">
              {liveAvailable === null ? "…" : mockMode ? "Mock · dry run" : "Live"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Presets</CardTitle>
              <CardDescription className="text-xs">
                Load a scenario, then edit the state and questions freely.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => applyPreset(preset.key)}
                  title={preset.description}
                >
                  {preset.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">State</CardTitle>
              <CardDescription className="text-xs">
                The situation Jev evaluates — JSON or plain text.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={stateText}
                onChange={(e) => setStateText(e.target.value)}
                spellCheck={false}
                className="min-h-36 font-mono text-xs"
                aria-label="State blob"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Questions</CardTitle>
              <CardDescription className="text-xs">
                Typed questions built with the SDK's <span className="font-mono">choice</span>,{" "}
                <span className="font-mono">score</span> and <span className="font-mono">noul</span> helpers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {questions.map((question) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  onChange={(next) => setQuestions((qs) => qs.map((q) => (q.id === next.id ? next : q)))}
                  onRemove={() => setQuestions((qs) => qs.filter((q) => q.id !== question.id))}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setQuestions((qs) => [...qs, blankQuestion("choice")])}
              >
                <Plus className="h-3.5 w-3.5" /> Add question
              </Button>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" disabled={!runnable} onClick={run}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running systemOne…" : "Run systemOne"}
          </Button>
        </div>

        <div className="space-y-4">
          <Card className="lg:sticky lg:top-5">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Result</CardTitle>
                {response && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={response.mode === "mock" ? "secondary" : "default"} className="text-[10px] uppercase">
                      {response.mode}
                    </Badge>
                    <span className="tabular-nums">{response.elapsedMs} ms</span>
                    <span className="font-mono">{response.result.model}</span>
                  </div>
                )}
              </div>
              <CardDescription className="text-xs">
                Answers are typed: a choice label, a rubric score, or a yes probability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}
              {!error && !response && (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  Run a decision to see typed answers here.
                </p>
              )}
              {response && (
                <Tabs defaultValue="answers">
                  <TabsList className="h-8">
                    <TabsTrigger value="answers" className="text-xs">
                      Answers
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="text-xs">
                      Raw JSON
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="answers" className="space-y-2.5 pt-2">
                    {Object.entries(response.result.answers).map(([name, answer]) => (
                      <AnswerCard key={name} name={name} answer={answer} />
                    ))}
                    <p className="text-right text-[11px] text-muted-foreground">
                      tokens: {response.result.usage.input_tokens} in · {response.result.usage.output_tokens} out
                    </p>
                  </TabsContent>
                  <TabsContent value="raw" className="pt-2">
                    <pre className="max-h-105 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                      {JSON.stringify(response.result, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-6">
        <p className="text-[11px] text-muted-foreground">
          No <span className="font-mono">TYPESAFE_API_KEY</span>? The dry-run mock mirrors the live response shape
          exactly. The key stays server-side — the browser never sees it.
        </p>
      </footer>
    </div>
  )
}
