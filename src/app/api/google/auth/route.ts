import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google/calendar'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate state parameter with user ID for verification
    const state = Buffer.from(JSON.stringify({ 
      userId: user.id,
      redirect: '/settings'
    })).toString('base64')

    // Generate Google OAuth URL
    const authUrl = getGoogleAuthUrl(state)
    
    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}