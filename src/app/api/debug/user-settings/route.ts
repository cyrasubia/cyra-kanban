import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user_settings (sanitized)
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('user_id, google_calendar_enabled, google_calendar_id, google_calendar_sync_enabled, last_sync_at, updated_at')
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      current_user_id: user.id,
      settings_count: settings?.length || 0,
      settings: settings?.map(s => ({
        ...s,
        user_id: s.user_id.substring(0, 8) + '...' // Partial ID for privacy
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
