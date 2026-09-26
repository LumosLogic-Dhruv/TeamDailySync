import * as React from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Table2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import type { SheetPreviewResponse } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function SheetPreviewPage() {
  const { user } = useAuth()
  const [data, setData] = React.useState<SheetPreviewResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    api
      .sheetsPreview(user.tabName)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  React.useEffect(() => {
    load()
  }, [load])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sheet Preview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only view of your Google Sheet tab (<span className="font-medium">{user?.tabName}</span>).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary" />
            {user?.tabName} tab
          </CardTitle>
          <CardDescription>
            Rows appear here as soon as the service account reads the sheet. Configure Sheet ID and
            Google credentials in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            data.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This tab is empty. Generate a report and hit "Update Sheet" to add your first rows.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-10">#</TableHead>
                      {data.rows[0].map((h, i) => (
                        <TableHead key={i} className="min-w-[120px] whitespace-nowrap">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.slice(1).map((row, ri) => (
                      <TableRow key={ri}>
                        <TableCell className="text-xs text-muted-foreground">{ri + 1}</TableCell>
                        {data.rows[0].map((_, ci) => (
                          <TableCell key={ci} className="whitespace-pre-wrap text-sm">
                            {row[ci] ?? ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
