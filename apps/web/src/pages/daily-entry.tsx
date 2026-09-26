import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Check,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import {
  loadEntries,
  saveEntries,
  saveLastReport,
  saveMetrics,
  loadMetrics,
  todayIso,
} from '@/lib/storage'
import type { WorkEntry } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

const QUICK_CHIPS = [
  'Worked on ',
  'Fixed ',
  'Implemented ',
  'Attended ',
  'Reviewed ',
  'Deployed ',
  'Tested ',
  'Wrote docs for ',
]

export function DailyEntryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [freeform, setFreeform] = React.useState('')
  const [entries, setEntries] = React.useState(() => loadEntries())
  const [totalHours, setTotalHours] = React.useState<string>('8')
  const [generating, setGenerating] = React.useState(false)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const [quickAdd, setQuickAdd] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Autosave freeform text every 2s when dirty
  React.useEffect(() => {
    if (!freeform) return
    const t = setTimeout(() => {
      const entry: WorkEntry = {
        id: `freeform-${todayIso()}`,
        raw: freeform,
        hours: Number(totalHours) || undefined,
        createdAt: new Date().toISOString(),
      }
      const rest = loadEntries().filter((e) => e.id !== entry.id)
      saveEntries([...rest, entry])
      setSavedAt(new Date().toLocaleTimeString())
    }, 2000)
    return () => clearTimeout(t)
  }, [freeform, totalHours])

  const addQuickEntry = () => {
    const text = quickAdd.trim()
    if (!text) return
    const entry = {
      id: `q-${Date.now()}`,
      raw: text,
      createdAt: new Date().toISOString(),
    }
    const next = [...loadEntries(), entry]
    saveEntries(next)
    setEntries(next)
    setQuickAdd('')
    toast({ title: 'Quick add saved', description: 'Logged for today’s report.' })
  }

  const appendChip = (chip: string) => {
    setFreeform((f) => (f ? `${f.trimEnd()}\n${chip}` : chip))
    textareaRef.current?.focus()
  }

  const handleGenerate = async () => {
    const all = loadEntries()
    const allText = [freeform.trim(), ...all.filter((e) => e.id.startsWith('q-')).map((e) => e.raw)]
      .filter(Boolean)
      .join('\n')
    if (!allText) {
      toast({ title: 'Nothing to process', description: 'Log some work first.', variant: 'destructive' })
      return
    }
    if (!user) return

    setGenerating(true)
    try {
      const res = await api.processAi({
        employeeName: user.name,
        employeeEmail: user.email,
        date: todayIso(),
        totalHours: Number(totalHours) || 8,
        entries: [{ id: 'combined', raw: allText, createdAt: new Date().toISOString() }],
      })
      saveLastReport(res.report)
      const m = loadMetrics()
      saveMetrics({ ...m, reportsGenerated: m.reportsGenerated + 1 })
      toast({
        title: `Report ready (${res.provider})`,
        description: 'Review and edit before sending.',
      })
      navigate('/generated-report')
    } catch (err) {
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Entry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log work as you go or write it all at EOD — AI combines everything.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Work</CardTitle>
            <CardDescription>
              One line per task. Rich formatting not required — AI will professionalize the tone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={freeform}
                onChange={(e) => setFreeform(e.target.value)}
                placeholder="Describe everything you worked on today..."
                className="min-h-[220px] resize-y text-base"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => appendChip(chip)}
                    className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {chip.trimEnd()}…
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hours">Total Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={totalHours}
                  onChange={(e) => setTotalHours(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <div className="flex w-full items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <Save className="h-3.5 w-3.5 shrink-0" />
                  {savedAt ? `Draft auto-saved at ${savedAt}` : 'Draft auto-saves every few seconds'}
                </div>
 </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick add */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Add Task
              </CardTitle>
              <CardDescription>
                Log 2–3 lines throughout the day instead of writing everything at EOD.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={quickAdd}
                onChange={(e) => setQuickAdd(e.target.value)}
                placeholder="e.g. Fixed pagination bug in reports module"
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addQuickEntry()
                }}
              />
              <Button onClick={addQuickEntry} className="w-full" variant="secondary">
                <Plus className="h-4 w-4" />
                Add entry
                <kbd className="ml-auto rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                  ⌘↵
                </kbd>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's entries ({entries.filter((e) => e.id.startsWith('q-')).length})</CardTitle>
              <CardDescription>These get merged into the AI report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnimatePresence initial={false}>
                {entries
                  .filter((e) => e.id.startsWith('q-'))
                  .map((e) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      className="group flex items-start gap-2 rounded-lg border bg-background/50 px-3 py-2"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{e.raw}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Delete entry"
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        onClick={() => {
                          const next = loadEntries().filter((x) => x.id !== e.id)
                          saveEntries(next)
                          setEntries(next)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
              </AnimatePresence>
              {entries.filter((e) => e.id.startsWith('q-')).length === 0 && (
                <p className="text-sm text-muted-foreground">No quick adds yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Bot className="h-4 w-4 shrink-0 text-primary" />
          <p>
            <span className="font-medium text-foreground">How it works:</span> when you hit Generate,
            all entries are sent to Gemini (Groq as fallback) and returned as structured tasks with
            a draft Slack EOD message. Nothing is sent anywhere until you approve it.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
