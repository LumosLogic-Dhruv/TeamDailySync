import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Send,
  Sparkles,
  Table2,
  Trash2,
  Wand2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import {
  loadLastReport,
  loadMetrics,
  saveMetrics,
  todayIso,
} from '@/lib/storage'
import type { GeneratedReport, StructuredTask } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const
const STATUSES = ['Done', 'In Progress', 'Blocked', 'Pending'] as const

function SlackMessageView({
  text,
  editable,
  onChange,
}: {
  text: string
  editable?: boolean
  onChange?: (v: string) => void
}) {
  const lines = text.split('\n')
  return (
    <div className="rounded-xl border bg-[#1a1d21] p-4 text-[#e8e8e8] shadow-inner">
      <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-2 text-xs text-white/50">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-white">
          AI
        </div>
        <span className="font-semibold text-white/80">AI Daily Sync</span>
        <span className="text-white/30">APP</span>
        <span className="ml-auto">just now</span>
      </div>
      {editable ? (
        <Textarea
          value={text}
          onChange={(e) => onChange?.(e.target.value)}
          className="min-h-[280px] resize-y border-white/10 bg-white/5 font-mono text-[13px] text-[#e8e8e8] placeholder:text-white/30 focus-visible:ring-ring"
        />
      ) : (
        <div className="space-y-1.5 text-[13.5px] leading-relaxed">
          {lines.map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-2" />
            if (line.startsWith('EOD :')) {
              return (
                <p key={i} className="text-lg font-bold text-white">
                  {line}
                </p>
              )
            }
            if (/^(.+?)\s(✅|🔄|⛔|⏳)/.test(line)) {
              return (
                <p key={i} className="font-semibold text-white">
                  {line}
                </p>
              )
            }
            if (line.startsWith('- ')) {
              return (
                <p key={i} className="ml-1 flex gap-2">
                  <span className="text-white/50">•</span>
                  {line.slice(2)}
                </p>
              )
            }
            return (
              <p key={i} className={cn('text-[#e8e8e8]', line.startsWith('_') && 'text-white/60')}>
                {line}
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function GeneratedReportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [report, setReport] = React.useState<GeneratedReport | null>(() => loadLastReport())
  const isMorning = report?.reportType === 'morning'
  const [slackText, setSlackText] = React.useState('')
  const [editSlack, setEditSlack] = React.useState(false)
  const [busy, setBusy] = React.useState<'sheet' | 'slack' | 'both' | null>(null)
  const [showEditHint, setShowEditHint] = React.useState(true)

  // Build Slack preview whenever the report changes
  React.useEffect(() => {
    if (!report) return
    api
      .slackPreview(report)
      .then((r) => setSlackText(r.text))
      .catch(() => {
        // Offline fallback: build locally from report
        const hours = Number.isInteger(report.totalHours) ? String(report.totalHours) : report.totalHours.toFixed(1)
        const lines = [`EOD : ${hours} Hr`, '']
        for (const t of report.tasks) {
          const emoji = t.status === 'Done' ? '✅' : t.status === 'In Progress' ? '🔄' : t.status === 'Blocked' ? '⛔' : '⏳'
          lines.push(`${t.project} ${emoji} ${t.status}`)
          if (t.client) lines.push(`Client: ${t.client}`)
          for (const d of t.taskDetails) lines.push(`- ${d}`)
          lines.push('')
        }
        setSlackText(lines.join('\n'))
      })
  }, [report])

  if (!report) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <CardTitle>No report yet</CardTitle>
            <CardDescription>
              Generate your first AI report from today's work entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/daily-entry')}>
              <Sparkles className="h-4 w-4" />
              Go to Daily Entry
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const updateTask = (id: string, patch: Partial<StructuredTask>) => {
    setReport((r) =>
      r ? { ...r, tasks: r.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) } : r,
    )
  }

  const removeTask = (id: string) => {
    setReport((r) => (r ? { ...r, tasks: r.tasks.filter((t) => t.id !== id) } : r))
  }

  const doUpdateSheet = async (): Promise<boolean> => {
    if (!report || !user) return false
    try {
      const res = await api.sheetsAppend(user.tabName, report)
      const m = loadMetrics()
      saveMetrics({ ...m, sheetUpdates: m.sheetUpdates + res.appended })
      toast({
        title: 'Sheet updated',
        description: `${res.appended} row(s) appended to "${user.tabName}" tab.`,
      })
      return true
    } catch (err) {
      toast({
        title: 'Sheet update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
      return false
    }
  }

  const doSendSlack = async (): Promise<boolean> => {
    if (!report || !user) return false
    try {
      await api.slackSend(report, editSlack ? slackText : undefined)
      const m = loadMetrics()
      saveMetrics({ ...m, slackSent: m.slackSent + 1 })
      toast({ title: isMorning ? 'Morning Plan sent to Slack 🌅' : 'Slack EOD sent 🎉', description: 'Delivered to your team channel.' })
      return true
    } catch (err) {
      toast({
        title: 'Slack send failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
      return false
    }
  }

  const handleUpdateSheet = async () => {
    setBusy('sheet')
    await doUpdateSheet()
    setBusy(null)
  }
  const handleSendSlack = async () => {
    setBusy('slack')
    await doSendSlack()
    setBusy(null)
  }
  const handleDoBoth = async () => {
    setBusy('both')
    const sheetOk = await doUpdateSheet()
    const slackOk = await doSendSlack()
    if (sheetOk && slackOk) {
      const m = loadMetrics()
      saveMetrics({ ...m, lastSentDate: todayIso() })
      toast({ title: 'Both done ✅', description: 'Sheet updated & Slack notified.' })
    }
    setBusy(null)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isMorning ? 'Morning Plan' : 'Generated Report'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.date} · {isMorning ? `${report.totalHours} hr planned` : `${report.totalHours} hr total`} · everything is editable before sending.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/daily-entry">
            <ArrowLeft className="h-4 w-4" />
            Back to Daily Entry
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Tasks table */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-primary" />
              Structured tasks ({report.tasks.length})
            </CardTitle>
            <CardDescription>
              Click any cell to edit. Changes reflect in the Slack preview instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showEditHint && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p>
                  The AI has grouped your raw notes into tasks. Review priorities, statuses and
                  wording — then send.
                </p>
                <button
                  type="button"
                  onClick={() => setShowEditHint(false)}
                  className="ml-auto shrink-0 rounded p-0.5 hover:text-foreground"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Task Details</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Est. Time</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.tasks.map((task) => (
                    <TableRow key={task.id}>
                      {/* Client */}
                      <TableCell className="min-w-[110px]">
                        <Input
                          className="h-8 border-transparent bg-transparent px-2 hover:border-input focus-visible:bg-background"
                          value={task.client}
                          onChange={(e) => updateTask(task.id, { client: e.target.value })}
                        />
                      </TableCell>
                      {/* Project */}
                      <TableCell className="min-w-[130px]">
                        <Input
                          className="h-8 border-transparent bg-transparent px-2 hover:border-input focus-visible:bg-background"
                          value={task.project}
                          onChange={(e) => updateTask(task.id, { project: e.target.value })}
                        />
                      </TableCell>
                      {/* Details */}
                      <TableCell className="min-w-[220px]">
                        <Textarea
                          className="min-h-[70px] border-transparent bg-transparent px-2 py-1 text-xs hover:border-input focus-visible:bg-background"
                          value={Array.isArray(task.taskDetails) ? task.taskDetails.join('\n') : task.taskDetails}
                          onChange={(e) =>
                            updateTask(task.id, {
                              taskDetails: e.target.value.split('\n'),
                            })
                          }
                        />
                      </TableCell>
                      {/* Priority */}
                      <TableCell>
                        <Select
                          value={task.priority}
                          onValueChange={(v) => updateTask(task.id, { priority: v as StructuredTask['priority'] })}
                        >
                          <SelectTrigger className="h-8 w-[100px] border-transparent bg-transparent shadow-none hover:border-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Estimated time */}
                      <TableCell className="min-w-[90px]">
                        <Input
                          className="h-8 border-transparent bg-transparent px-2 hover:border-input focus-visible:bg-background"
                          value={task.estimatedTime}
                          onChange={(e) => updateTask(task.id, { estimatedTime: e.target.value })}
                        />
                      </TableCell>
                      {/* Time spent */}
                      <TableCell className="min-w-[90px]">
                        <Input
                          className="border-transparent bg-transparent px-2 hover:border-input focus-visible:bg-background"
                          value={task.timeSpent}
                          onChange={(e) => updateTask(task.id, { timeSpent: e.target.value })}
                        />
                      </TableCell>
                      {/* Output */}
                      <TableCell className="min-w-[200px]">
                        <Textarea
                          className="min-h-[70px] border-transparent bg-transparent px-2 py-1 text-xs hover:border-input focus-visible:bg-background"
                          value={task.output}
                          onChange={(e) => updateTask(task.id, { output: e.target.value })}
                        />
                      </TableCell>
                      {/* Status */}
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(v) => updateTask(task.id, { status: v as StructuredTask['status'] })}
                        >
                          <SelectTrigger className="h-8 w-[110px] border-transparent bg-transparent shadow-none hover:border-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          aria-label="Remove task"
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                          onClick={() => removeTask(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Pencil className="h-3 w-3" />
              Tip: click a row's fields directly — no edit mode needed.
            </div>
          </CardContent>
        </Card>

        {/* Slack preview + actions */}
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  {isMorning ? 'Slack Morning Plan Preview' : 'Slack EOD Preview'}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={editSlack ? 'Preview mode' : 'Edit mode'}
                    onClick={() => setEditSlack((v) => !v)}
                  >
                    {editSlack ? <EyeOff className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Copy message"
                    onClick={() => {
                      navigator.clipboard.writeText(slackText)
                      toast({ title: 'Copied', description: 'Message copied to clipboard.' })
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Rendered exactly as Slack will show it. Toggle the pencil to edit before sending.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SlackMessageView
                text={slackText}
                editable={editSlack}
                onChange={setSlackText}
              />

              <div className="grid gap-2">
                {isMorning ? (
                  <Button onClick={handleSendSlack} disabled={busy !== null}>
                    {busy === 'slack' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Morning Plan to Slack
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleDoBoth} disabled={busy !== null}>
                      {busy === 'both' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Do Both (Sheet + Slack)
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={handleUpdateSheet} disabled={busy !== null}>
                        {busy === 'sheet' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table2 className="h-4 w-4" />}
                        Update Sheet
                      </Button>
                      <Button variant="outline" onClick={handleSendSlack} disabled={busy !== null}>
                        {busy === 'slack' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send Slack
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {!isMorning && (
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  Rows append to the <span className="mx-1 font-medium text-foreground">"{user?.tabName}"</span> tab.
                  Configure the sheet in Settings first.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
