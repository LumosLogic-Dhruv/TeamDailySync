import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Bot,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Save,
  Table2,
  Trash2,
  Users,
  Webhook,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { RedactedSettings, TeamMember } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

function SecureInput({
  id,
  label,
  hint,
  configured,
  placeholder,
  onSave,
}: {
  id: string
  label: string
  hint?: string
  configured: boolean
  placeholder?: string
  onSave: (value: string) => void
}) {
  const [value, setValue] = React.useState('')
  const [show, setShow] = React.useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <Badge variant={configured ? 'success' : 'warning'} className="text-[10px]">
          {configured ? 'Configured' : 'Not set'}
        </Badge>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="ml-2 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label={show ? 'Hide' : 'Show'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={configured ? '•••••••••••••••• (saved)' : placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (value.trim()) {
              onSave(value.trim())
              setValue('')
            }
          }}
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = React.useState<RedactedSettings | null>(null)
  const [sheetId, setSheetId] = React.useState('')
  const [slackUrl, setSlackUrl] = React.useState('')
  const [saEmail, setSaEmail] = React.useState('')
  const [saKey, setSaKey] = React.useState('')
  const [mapping, setMapping] = React.useState<TeamMember[]>([])
  const [newEmail, setNewEmail] = React.useState('')
  const [newTab, setNewTab] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s)
      setSheetId(s.sheetId ?? '')
      setMapping(s.userMapping)
    })
  }, [])

  const save = async (payload: Record<string, unknown>, title: string) => {
    setSaving(true)
    try {
      const s = await api.saveSettings(payload)
      setSettings(s)
      setMapping(s.userMapping)
      toast({ title, description: 'Saved successfully.' })
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keys are stored server-side in <code className="rounded bg-muted px-1">data/settings.json</code> (git-ignored).
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* AI providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              AI Providers
            </CardTitle>
            <CardDescription>
              Gemini is primary; Groq is the automatic fallback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <SecureInput
              id="gemini"
              label="Gemini API Key"
              configured={settings?.hasGeminiKey ?? false}
              placeholder="AIza..."
              hint="Get one free at aistudio.google.com → Get API key."
              onSave={(v) => save({ geminiApiKey: v }, 'Gemini key saved')}
            />
            <SecureInput
              id="groq"
              label="Groq API Key"
              configured={settings?.hasGroqKey ?? false}
              placeholder="gsk_..."
              hint="Get one free at console.groq.com."
              onSave={(v) => save({ groqApiKey: v }, 'Groq key saved')}
            />
          </CardContent>
        </Card>

        {/* Google Sheet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-primary" />
              Google Sheet
            </CardTitle>
            <CardDescription>
              Share the sheet with the service account email as Editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sheetId">Google Sheet ID</Label>
                <Badge variant={settings?.hasSheetId ? 'success' : 'warning'} className="text-[10px]">
                  {settings?.hasSheetId ? 'Configured' : 'Not set'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  id="sheetId"
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={saving}
                  onClick={() => save({ sheetId }, 'Sheet ID saved')}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The long ID in the sheet URL between /d/ and /edit.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saEmail">Service account email</Label>
              <div className="flex gap-2">
                <Input
                  id="saEmail"
                  type="email"
                  placeholder="sync-bot@project.iam.gserviceaccount.com"
                  value={saEmail}
                  onChange={(e) => setSaEmail(e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={saving || !saEmail.trim()}
                  onClick={() => save({ googleServiceAccountEmail: saEmail.trim() }, 'Service account saved')}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saKey">Service account private key</Label>
              <Textarea
                id="saKey"
                className="font-mono text-xs"
                placeholder={'-----BEGIN PRIVATE KEY-----\\nMIIEvQ...\\n-----END PRIVATE KEY-----\\n'}
                value={saKey}
                onChange={(e) => setSaKey(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={saving || !saKey.trim()}
                onClick={() => {
                  save({ googlePrivateKey: saKey }, 'Private key saved')
                  setSaKey('')
                }}
              >
                <KeyRound className="h-4 w-4" />
                Save private key
              </Button>
              <p className="text-xs text-muted-foreground">
                {settings?.hasServiceAccount
                  ? 'Private key is stored server-side and never returned to the browser.'
                  : 'Paste the full PEM including header/footer lines.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Slack */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              Slack
            </CardTitle>
            <CardDescription>
              Incoming Webhook from your Slack app (api.slack.com/apps → Incoming Webhooks).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slackUrl">Webhook URL</Label>
              <Badge variant={settings?.hasSlackWebhook ? 'success' : 'warning'} className="text-[10px]">
                {settings?.hasSlackWebhook ? 'Configured' : 'Not set'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Input
                id="slackUrl"
                type="url"
                placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => save({ slackWebhookUrl: slackUrl.trim() }, 'Webhook saved')}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User mapping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              User Mapping
            </CardTitle>
            <CardDescription>
              Maps a Google account email to its sheet tab name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {mapping.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={m.email}
                    onChange={(e) =>
                      setMapping((prev) =>
                        prev.map((x, xi) => (xi === i ? { ...x, email: e.target.value } : x)),
                      )
                    }
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    className="w-36"
                    value={m.tabName}
                    onChange={(e) =>
                      setMapping((prev) =>
                        prev.map((x, xi) => (xi === i ? { ...x, tabName: e.target.value } : x)),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove mapping"
                    onClick={() => setMapping((prev) => prev.filter((_, xi) => xi !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t pt-3">
              <Input
                placeholder="new.member@lumoslogic.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Input
                className="w-36"
                placeholder="Tab name"
                value={newTab}
                onChange={(e) => setNewTab(e.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Add mapping"
                onClick={() => {
                  if (newEmail.trim() && newTab.trim()) {
                    setMapping((prev) => [
                      ...prev,
                      { email: newEmail.trim().toLowerCase(), tabName: newTab.trim() },
                    ])
                    setNewEmail('')
                    setNewTab('')
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() =>
                save(
                  { userMapping: mapping.filter((m) => m.email && m.tabName) },
                  'User mapping saved',
                )
              }
            >
              <Check className="h-4 w-4" />
              Save mapping
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
