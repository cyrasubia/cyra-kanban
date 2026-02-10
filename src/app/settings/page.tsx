'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Link as LinkIcon, 
  Unlink,
  Loader2,
  ArrowLeft
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [settings, setSettings] = useState({
    google_calendar_enabled: false,
    google_calendar_id: 'primary',
    google_calendar_sync_enabled: false,
    last_sync_at: null as string | null
  })
  const [user, setUser] = useState<any>(null)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Check auth and load settings
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadSettings()
      
      // Handle OAuth callback success/error
      const success = searchParams.get('success')
      const error = searchParams.get('error')
      
      if (success === 'connected') {
        setMessage({ type: 'success', text: 'Google Calendar connected successfully!' })
        // Clear query params
        window.history.replaceState({}, '', '/settings')
      } else if (error) {
        const errorMessages: Record<string, string> = {
          google_auth_failed: 'Google authentication failed',
          no_code: 'No authorization code received',
          invalid_state: 'Invalid state parameter',
          no_state: 'No state parameter',
          no_tokens: 'Failed to get tokens from Google',
          storage_failed: 'Failed to save connection',
          callback_failed: 'Callback processing failed'
        }
        setMessage({ type: 'error', text: errorMessages[error] || 'Connection failed' })
        window.history.replaceState({}, '', '/settings')
      }
    }
    checkAuth()
  }, [router, supabase.auth, searchParams])

  // Load settings from API
  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle Google Calendar connection
  const handleConnectGoogle = async () => {
    setConnecting(true)
    try {
      const response = await fetch('/api/google/auth')
      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        setMessage({ type: 'error', text: 'Failed to initiate Google connection' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to Google' })
    } finally {
      setConnecting(false)
    }
  }

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will remove all sync connections.')) {
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch('/api/settings', { method: 'DELETE' })
      if (response.ok) {
        setSettings(prev => ({
          ...prev,
          google_calendar_enabled: false,
          google_calendar_sync_enabled: false,
          last_sync_at: null
        }))
        setMessage({ type: 'success', text: 'Google Calendar disconnected successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect' })
    } finally {
      setSaving(false)
    }
  }

  // Update sync settings
  const updateSyncEnabled = async (enabled: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_calendar_sync_enabled: enabled })
      })
      
      if (response.ok) {
        setSettings(prev => ({ ...prev, google_calendar_sync_enabled: enabled }))
        setMessage({ type: 'success', text: `Sync ${enabled ? 'enabled' : 'disabled'} successfully` })
      } else {
        setMessage({ type: 'error', text: 'Failed to update settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Settings</h1>
            <p className="text-slate-500 text-sm">Configure your Kanban board preferences</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Google Calendar Section */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Google Calendar</h2>
                <p className="text-sm text-slate-400">Sync tasks with your Google Calendar</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {!settings.google_calendar_enabled ? (
              // Not connected state
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Connect Google Calendar</h3>
                <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                  Sync your tasks with Google Calendar. Tasks with due dates will automatically appear in your calendar.
                </p>
                <button
                  onClick={handleConnectGoogle}
                  disabled={connecting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Connect Google Calendar
                    </>
                  )}
                </button>
              </div>
            ) : (
              // Connected state
              <>
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Connected</p>
                      <p className="text-xs text-slate-400">
                        Last synced: {settings.last_sync_at 
                          ? new Date(settings.last_sync_at).toLocaleString() 
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={saving}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors flex items-center gap-1"
                  >
                    <Unlink className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>

                {/* Sync Toggle */}
                <div className="flex items-center justify-between py-4 border-t border-slate-800">
                  <div>
                    <p className="text-white font-medium">Auto-sync new tasks</p>
                    <p className="text-xs text-slate-400">
                      Automatically add tasks with due dates to Google Calendar
                    </p>
                  </div>
                  <button
                    onClick={() => updateSyncEnabled(!settings.google_calendar_sync_enabled)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.google_calendar_sync_enabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.google_calendar_sync_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Calendar ID Info */}
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Calendar</p>
                  <p className="text-sm text-white">
                    {settings.google_calendar_id === 'primary' ? 'Primary Calendar' : settings.google_calendar_id}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}