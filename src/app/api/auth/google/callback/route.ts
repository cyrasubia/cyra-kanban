import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getCalendarClient } from '@/lib/google/calendar'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Get app URL from env or default
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cyra-kanban.vercel.app'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(`${APP_URL}/settings?error=google_auth_failed`)
    }

    if (!code) {
      return NextResponse.redirect(`${APP_URL}/settings?error=no_code`)
    }

    // Parse state to get user ID
    let userId: string
    let redirectPath = '/settings'
    
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        userId = stateData.userId
        redirectPath = stateData.redirect || '/settings'
      } catch {
        return NextResponse.redirect(`${APP_URL}/settings?error=invalid_state`)
      }
    } else {
      return NextResponse.redirect(`${APP_URL}/settings?error=no_state`)
    }

    // Exchange code for tokens
    let tokens
    try {
      tokens = await exchangeCodeForTokens(code)
    } catch (tokenError: any) {
      console.error('Token exchange error:', tokenError.message)
      return NextResponse.redirect(`${APP_URL}/settings?error=token_exchange_failed`)
    }
    
    if (!tokens.access_token) {
      console.error('No access token in response:', tokens)
      return NextResponse.redirect(`${APP_URL}/settings?error=no_access_token`)
    }
    
    if (!tokens.refresh_token) {
      console.log('No refresh token - user may have already authorized')
      // Continue without refresh token - access token will work for now
    }

    // Get user's primary calendar ID
    const calendar = await getCalendarClient(tokens.access_token, tokens.refresh_token || undefined)
    const calendarList = await calendar.calendarList.list()
    const primaryCalendar = calendarList.data.items?.find(c => c.primary) || calendarList.data.items?.[0]

    // Store tokens in user_settings
    const supabase = await createClient()
    
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        google_calendar_enabled: true,
        google_calendar_id: primaryCalendar?.id || 'primary',
        google_calendar_sync_enabled: true,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expires_at: tokens.expiry_date 
          ? new Date(tokens.expiry_date).toISOString() 
          : null,
        last_sync_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError)
      return NextResponse.redirect(`${APP_URL}/settings?error=storage_failed`)
    }

    return NextResponse.redirect(`${APP_URL}${redirectPath}?success=connected`)
  } catch (error: any) {
    console.error('Google callback error:', error)
    console.error('Error details:', error.message, error.stack)
    return NextResponse.redirect(`${APP_URL}/settings?error=callback_failed`)
  }
}