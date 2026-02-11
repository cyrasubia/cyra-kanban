import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarClient, refreshAccessToken } from '@/lib/google/calendar'
import { calendar_v3 } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface GoogleCalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  isAllDay: boolean
  location?: string
  hangoutLink?: string
  source: 'google'
}

// GET /api/calendar/google/events - Fetch Google Calendar events for a date range
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: 'Missing required parameters: timeMin and timeMax' },
        { status: 400 }
      )
    }

    // Fetch user's Google Calendar settings and tokens
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('google_calendar_enabled, google_calendar_id, google_access_token, google_refresh_token, google_token_expires_at')
      .eq('user_id', user.id)
      .single()

    if (settingsError) {
      console.error('Settings fetch error:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch user settings' },
        { status: 500 }
      )
    }

    if (!settings?.google_calendar_enabled) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      )
    }

    if (!settings.google_access_token) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 400 }
      )
    }

    let accessToken = settings.google_access_token
    const refreshToken = settings.google_refresh_token

    // Check if token is expired and refresh if needed
    if (settings.google_token_expires_at) {
      const expiresAt = new Date(settings.google_token_expires_at)
      const now = new Date()
      
      // Refresh if token expires within 5 minutes
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        if (!refreshToken) {
          return NextResponse.json(
            { error: 'Token expired and no refresh token available' },
            { status: 401 }
          )
        }
        
        try {
          accessToken = await refreshAccessToken(refreshToken)
          
          // Update the access token in database
          await supabase
            .from('user_settings')
            .update({
              google_access_token: accessToken,
              google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString() // Tokens valid for 1 hour
            })
            .eq('user_id', user.id)
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          return NextResponse.json(
            { error: 'Failed to refresh access token' },
            { status: 401 }
          )
        }
      }
    }

    // Create calendar client
    const calendar = await getCalendarClient(accessToken, refreshToken || undefined)

    // Fetch events from Google Calendar
    const calendarId = settings.google_calendar_id || 'primary'
    
    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true, // Expand recurring events
        orderBy: 'startTime',
        maxResults: 250
      })

      const events = response.data.items || []

      // Format events for frontend
      const formattedEvents: GoogleCalendarEvent[] = events.map((event: calendar_v3.Schema$Event) => {
        const isAllDay = !!event.start?.date
        
        return {
          id: event.id || '',
          title: event.summary || '(No title)',
          description: event.description || undefined,
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          isAllDay,
          location: event.location || undefined,
          hangoutLink: event.hangoutLink || undefined,
          source: 'google'
        }
      })

      return NextResponse.json({
        events: formattedEvents,
        count: formattedEvents.length
      })
    } catch (calendarError: any) {
      console.error('Google Calendar API error:', calendarError)
      
      // Check if it's an auth error
      if (calendarError.code === 401) {
        return NextResponse.json(
          { error: 'Google Calendar authorization expired' },
          { status: 401 }
        )
      }
      
      throw calendarError
    }
  } catch (error: any) {
    console.error('Get Google Calendar events error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: error.message },
      { status: 500 }
    )
  }
}
