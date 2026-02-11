import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  getCalendarClient, 
  syncTaskToCalendar, 
  deleteCalendarEvent,
  refreshAccessToken 
} from '@/lib/google/calendar'
import type { Task } from '@/types/kanban'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/sync/task - Sync a task to Google Calendar
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, action = 'sync' } = body // action: 'sync' | 'delete'

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    // Get user's Google Calendar settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings?.google_calendar_enabled || !settings.google_calendar_sync_enabled) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
    }

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Handle delete action
    if (action === 'delete') {
      if (task.google_calendar_event_id) {
        try {
          // Refresh token if needed
          let accessToken = settings.google_access_token
          if (settings.google_token_expires_at && new Date(settings.google_token_expires_at) < new Date()) {
            accessToken = await refreshAccessToken(settings.google_refresh_token!)
            await supabase
              .from('user_settings')
              .update({ google_access_token: accessToken })
              .eq('user_id', user.id)
          }

          const calendar = await getCalendarClient(accessToken!, settings.google_refresh_token!)
          await deleteCalendarEvent(task.google_calendar_event_id, calendar, settings.google_calendar_id || 'primary')
        } catch (error) {
          console.error('Failed to delete calendar event:', error)
        }
      }

      // Clear sync status from task
      await supabase
        .from('tasks')
        .update({
          google_calendar_event_id: null,
          google_calendar_sync_status: null,
          google_calendar_synced_at: null
        })
        .eq('id', taskId)

      return NextResponse.json({ success: true, action: 'deleted' })
    }

    // Only sync tasks with due dates
    if (!task.event_date) {
      return NextResponse.json({ error: 'Task has no due date' }, { status: 400 })
    }

    // Refresh access token if expired
    let accessToken = settings.google_access_token
    if (settings.google_token_expires_at && new Date(settings.google_token_expires_at) < new Date()) {
      try {
        accessToken = await refreshAccessToken(settings.google_refresh_token!)
        await supabase
          .from('user_settings')
          .update({ google_access_token: accessToken })
          .eq('user_id', user.id)
      } catch (error) {
        console.error('Failed to refresh token:', error)
        await supabase
          .from('tasks')
          .update({
            google_calendar_sync_status: 'error',
            google_calendar_error: 'Token refresh failed'
          })
          .eq('id', taskId)
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 })
      }
    }

    // Sync task to calendar
    try {
      const calendar = await getCalendarClient(accessToken!, settings.google_refresh_token!)
      const eventId = await syncTaskToCalendar(task, calendar, settings.google_calendar_id || 'primary')

      // Update task with sync info
      await supabase
        .from('tasks')
        .update({
          google_calendar_event_id: eventId,
          google_calendar_sync_status: 'synced',
          google_calendar_synced_at: new Date().toISOString(),
          google_calendar_error: null
        })
        .eq('id', taskId)

      return NextResponse.json({ 
        success: true, 
        eventId,
        action: task.google_calendar_event_id ? 'updated' : 'created'
      })
    } catch (error: any) {
      console.error('Calendar sync error:', error)
      
      // Update task with error status
      await supabase
        .from('tasks')
        .update({
          google_calendar_sync_status: 'error',
          google_calendar_error: error.message || 'Sync failed'
        })
        .eq('id', taskId)

      return NextResponse.json(
        { error: 'Calendar sync failed', details: error.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Sync task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}