import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('google_calendar_enabled, google_calendar_id, google_calendar_sync_enabled, last_sync_at, updated_at')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error
    }

    return NextResponse.json({
      google_calendar_enabled: settings?.google_calendar_enabled ?? false,
      google_calendar_id: settings?.google_calendar_id || 'primary',
      google_calendar_sync_enabled: settings?.google_calendar_sync_enabled ?? false,
      last_sync_at: settings?.last_sync_at,
      updated_at: settings?.updated_at
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { google_calendar_sync_enabled, google_calendar_id } = body

    const { data: settings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...(google_calendar_sync_enabled !== undefined && { google_calendar_sync_enabled }),
        ...(google_calendar_id !== undefined && { google_calendar_id })
      }, {
        onConflict: 'user_id'
      })
      .select('google_calendar_enabled, google_calendar_id, google_calendar_sync_enabled, last_sync_at')
      .single()

    if (error) throw error

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/google - Disconnect Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('user_settings')
      .update({
        google_calendar_enabled: false,
        google_calendar_sync_enabled: false,
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null
      })
      .eq('user_id', user.id)

    if (error) throw error

    // Also clear sync status from all tasks
    await supabase
      .from('tasks')
      .update({
        google_calendar_event_id: null,
        google_calendar_sync_status: null,
        google_calendar_synced_at: null
      })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect Google Calendar error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}