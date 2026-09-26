import * as React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  ClipboardList,
  FileText,
  Send,
  Sparkles,
  Table2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { loadEntries, loadMetrics, todayIso } from '@/lib/storage'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

interface RecentEntry {
  id: string
  raw: string
  createdAt: string
}

export function DashboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = React.useState<RecentEntry[]>([])
  const [metrics, setMetrics] = React.useState(loadMetrics)
  const [team, setTeam] = React.useState<{ email: string; tabName: string }[]>([])
  const [teamLoading, setTeamLoading] = React.useState(true)

  React.useEffect(() => {
    setEntries(loadEntries().slice(-5).reverse())
    setMetrics(loadMetrics())
    api
      .getTeam()
      .then((r) => setTeam(r.mapping))
      .catch(() => setTeam([]))
      .finally(() => setTeamLoading(false))
  }, [])

  const today = todayIso()
  const loggedToday = loadEntries().some((e) => e.createdAt.startsWith(today))

  const stats = [
    {
      label: 'Entries today',
      value: String(loadEntries().filter((e) => e.createdAt.startsWith(today)).length),
      icon: ClipboardList,
      hint: 'Quick-add logs captured',
    },
    {
      label: 'Reports generated',
      value: String(metrics.reportsGenerated),
      icon: FileText,
      hint: 'Lifetime AI reports',
    },
    {
      label: 'Sheet rows appended',
      value: String(metrics.sheetUpdates),
      icon: Table2,
      hint: 'Rows written to your tab',
    },
    {
      label: 'Slack EODs sent',
      value: String(metrics.slackSent),
      icon: Send,
      hint: 'Messages delivered',
    },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero */}
      <motion.section variants={item} className="relative overflow-hidden rounded-2xl border bg-card p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <Sparkles className="h-3 w-3" /> AI Daily Sync
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
            {greeting()}, {user?.name ?? 'there'} —{' '}
            <span className="text-gradient">let's close out the day.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Log work as you go, and AI turns it into a polished EOD update for Slack and your
            Google Sheet tab — no manual copy-pasting.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/daily-entry">
                <ClipboardList className="h-4 w-4" />
                {loggedToday ? 'Continue today’s entry' : 'Start today’s entry'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/generated-report">
                <FileText className="h-4 w-4" />
                View last report
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section variants={item} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="relative overflow-hidden">
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Workflow */}
        <motion.section variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Your EOD workflow
              </CardTitle>
              <CardDescription>Three steps — under two minutes at end of day.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: ClipboardList,
                  title: '1. Log work',
                  desc: 'Quick-add 2–3 lines as you go. Auto-saved locally.',
                  to: '/daily-entry',
                },
                {
                  icon: Bot,
                  title: '2. Generate',
                  desc: 'Gemini structures tasks & drafts the Slack EOD.',
                  to: '/generated-report',
                },
                {
                  icon: Send,
                  title: '3. Ship it',
                  desc: 'Update your sheet tab, send Slack, or do both.',
                  to: '/generated-report',
                },
              ].map((step) => (
                <Link
                  key={step.title}
                  to={step.to}
                  className="group rounded-xl border bg-background/50 p-4 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.section>

        {/* Team */}
        <motion.section variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Team &amp; sheet tabs
              </CardTitle>
              <CardDescription>Mapping from Settings → User Mapping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamLoading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
                : team.map((m) => (
                    <div
                      key={m.email}
                      className="flex items-center gap-3 rounded-lg border bg-background/50 px-3 py-2"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {m.tabName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.tabName}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {m.tabName} tab
                      </Badge>
                    </div>
                  ))}
              {!teamLoading && team.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No team mapping configured yet — add members in Settings.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </div>

      {/* Recent entries */}
      <motion.section variants={item}>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" />
                Recent quick-adds
              </CardTitle>
              <CardDescription>Last 5 entries from your Daily Entry page.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/daily-entry">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing logged yet. Head to Daily Entry and quick-add your first task.
              </p>
            )}
            {entries.map((e) => (
              <div key={e.id} className="rounded-lg border bg-background/50 px-3 py-2.5">
                <p className="text-sm">{e.raw}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
