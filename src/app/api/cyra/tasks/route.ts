import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getCalendarClient, syncTaskToCalendar } from '@/lib/google/calendar'

export const runtime = 'nodejs'

const API_KEY = process.env.CYRA_TASKS_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL

// Accept BOTH common env var names so Vercel config mismatches don't break prod.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

// Prefer explicitly configured Victor user id; fallback to resolving by email.
const VICTOR_USER_ID = process.env.VICTOR_USER_ID
const VICTOR_EMAIL = process.env.VICTOR_EMAIL || 'victor@insiderclicks.com'

function validateApiKey(request: NextRequest) {
  if (!API_KEY) {
    console.error('CYRA_TASKS_API_KEY not configured')
    return false
  }

  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return false

  const provided = header.substring(7).trim()
  return provided === API_KEY
}

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (check env vars on Vercel)'
    )
  }

  // Service role key must ONLY exist server-side (Vercel env is fine).
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })
}

async function resolveVictorUserId(supabase: SupabaseClient): Promise<string | null> {
  // 1) If explicitly provided, use it.
  if (VICTOR_USER_ID) return VICTOR_USER_ID

  // 2) Resolve by profiles.email (your screenshot shows profiles has `email`).
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email')
    .eq('email', VICTOR_EMAIL)
    .limit(1)
    .single()

  if (error || !data?.id) {
    console.error('Unable to resolve Victor user id', {
      email: VICTOR_EMAIL,
      error: error?.message
    })
    return null
  }

  return data.id
}

type TaskPayload = {
  title?: string
  description?: string

  // Allow either naming scheme from agents/tools:
  client_name?: string
  project?: string

  // Allow either naming scheme:
  column?: string
  column_id?: string

  priority?: string
  event_date?: string
  source?: string
}

function normalizePriority(value?: string) {
  if (!value) return 'medium'
  const candidate = value.toLowerCase().trim()
  if (['low', 'medium', 'high'].includes(candidate)) return candidate
  if (candidate.startsWith('med')) return 'medium'
  return 'medium'
}

/**
 * Your DB column is `column_id` (text). In your UI screenshot you have values like:
 * - done
 * - inbox (likely)
 *
 * We accept:
 * - "Inbox" / "inbox" / "INBOX" -> "inbox"
 * - any other string -> trimmed lowercase
 */
function normalizeColumnId(value?: string) {
  if (!value) return 'inbox'
  const v = value.trim()
  if (!v) return 'inbox'
  if (v.toLowerCase() === 'inbox') return 'inbox'
  return v.toLowerCase()
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: TaskPayload
  try {
    payload = (await request.json()) as TaskPayload
    console.log('[PAYLOAD] Received:', JSON.stringify({
      title: payload.title,
      event_date: payload.event_date,
      event_date_type: typeof payload.event_date
    }))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = payload.title?.trim()
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  let supabase: SupabaseClient
  try {
    supabase = getSupabase()
  } catch (error: any) {
    console.error('Supabase client error', error?.message)
    return NextResponse.json({ error: error?.message || 'Supabase misconfigured' }, { status: 500 })
  }

  const userId = await resolveVictorUserId(supabase)
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    // Accept both fields; prefer column_id if provided.
    const columnId = normalizeColumnId(payload.column_id ?? payload.column)
    const priority = normalizePriority(payload.priority)

    // Prefer project, fallback to client_name
    const project = (payload.project ?? payload.client_name ?? null) as string | null

    // Compute position safely. If none exist, start at 1.
    const { data: maxPositionData, error: maxPosErr } = await supabase
      .from('tasks')
      .select('position')
      .eq('user_id', userId)
      .eq('column_id', columnId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxPosErr) {
      console.error('Failed to read max position', { error: maxPosErr.message })
      throw maxPosErr
    }

    const maxPosition = typeof maxPositionData?.position === 'number' ? maxPositionData.position : 0

    // Convert event_date to UTC for storage
    console.log('[EVENT_DATE] payload.event_date value:', payload.event_date, 'Type:', typeof payload.event_date, 'Truthy?:', !!payload.event_date)
    let eventDate = payload.event_date || null
    if (eventDate) {
      console.log('[EVENT_DATE] Raw input:', eventDate, 'Type:', typeof eventDate)
      
      try {
        // Parse the date
        const parsedDate = new Date(eventDate)
        
        console.log('[EVENT_DATE] Parsed Date object:', parsedDate)
        console.log('[EVENT_DATE] Is valid?', !isNaN(parsedDate.getTime()))
        
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date')
        }
        
        // Check if the original string has timezone info
        const hasTimezone = /[+-]\d{2}:\d{2}$/.test(eventDate) || eventDate.endsWith('Z')
        console.log('[EVENT_DATE] Has timezone?', hasTimezone)
        
        if (!hasTimezone) {
          // The Date constructor interprets strings without timezone as LOCAL time (UTC on server)
          // We need to treat it as Central Time (UTC-6), so add 6 hours
          console.log('[EVENT_DATE] Before TZ conversion:', parsedDate.toISOString())
          parsedDate.setHours(parsedDate.getHours() + 6)
          console.log('[EVENT_DATE] After adding 6h for CT→UTC:', parsedDate.toISOString())
        }
        
        // Store as UTC ISO string
        eventDate = parsedDate.toISOString()
        console.log('[EVENT_DATE] Final UTC:', eventDate)
      } catch (err: any) {
        console.error('[EVENT_DATE] Parse error:', {
          error: err.message,
          stack: err.stack,
          input: eventDate
        })
        // Keep the original value - let PostgreSQL try to parse it
        console.log('[EVENT_DATE] Keeping original value for PostgreSQL to parse')
      }
    }

    const insertRow: any = {
      user_id: userId,
      title,
      description: payload.description ?? null,
      column_id: columnId,
      priority,
      position: maxPosition + 1,
      project,
      created_by: 'cyra',
      event_date: eventDate
    }

    console.log('[INSERT] About to insert row:', JSON.stringify({
      ...insertRow,
      user_id: '***', // Redact sensitive ID
      event_date: insertRow.event_date
    }))

    const { data: task, error: insertErr } = await supabase
      .from('tasks')
      .insert(insertRow)
      .select('*')
      .single()
    
    console.log('[INSERT] Insert result:', {
      success: !insertErr,
      task_id: task?.id,
      event_date_in_result: task?.event_date,
      error: insertErr?.message
    })

    if (insertErr || !task) {
      // Log the full details so Vercel logs show the real cause (RLS, missing col, etc.)
      console.error('Supabase insert failed', {
        message: insertErr?.message,
        details: (insertErr as any)?.details,
        hint: (insertErr as any)?.hint,
        code: (insertErr as any)?.code,
        insertRow
      })
      throw insertErr ?? new Error('Unknown insert failure')
    }

    // Sync to Google Calendar if event_date is provided and user has Google Calendar enabled
    if (task.event_date) {
      console.log('[SYNC] Task has event_date, checking Google Calendar settings...')
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (settingsError) {
          console.error('[SYNC] Failed to fetch settings:', settingsError)
          throw settingsError
        }

        console.log('[SYNC] Settings:', {
          enabled: settings?.google_calendar_enabled,
          sync_enabled: settings?.google_calendar_sync_enabled,
          has_token: !!settings?.google_access_token
        })

        if (settings?.google_calendar_enabled && settings?.google_calendar_sync_enabled && settings?.google_access_token) {
          console.log('[SYNC] Creating calendar client...')
          const calendar = await getCalendarClient(settings.google_access_token, settings.google_refresh_token || undefined)
          
          console.log('[SYNC] Syncing task to calendar...')
          const eventId = await syncTaskToCalendar(task, calendar, settings.google_calendar_id || 'primary')
          
          console.log('[SYNC] Sync successful, event ID:', eventId)
          
          // Update task with Google Calendar event ID
          await supabase
            .from('tasks')
            .update({
              google_calendar_event_id: eventId,
              google_calendar_sync_status: 'synced',
              google_calendar_synced_at: new Date().toISOString()
            })
            .eq('id', task.id)
          
          console.log(`[SYNC] Task ${task.id} synced to Google Calendar: ${eventId}`)
        } else {
          console.log('[SYNC] Google Calendar sync not enabled or no access token')
        }
      } catch (syncError: any) {
        // Log but don't fail the request - task is still created
        console.error('[SYNC] Google Calendar sync failed:', {
          message: syncError?.message,
          stack: syncError?.stack,
          error: syncError
        })
        
        // Update task with error status
        await supabase
          .from('tasks')
          .update({
            google_calendar_sync_status: 'error',
            google_calendar_error: syncError?.message || 'Sync failed'
          })
          .eq('id', task.id)
      }
    } else {
      console.log('[SYNC] No event_date on task, skipping Google Calendar sync')
    }

    return NextResponse.json({ ok: true, id: task.id }, { status: 201 })
  } catch (error: any) {
    console.error('Cyra tasks endpoint error', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
