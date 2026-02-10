import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google/calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Get the redirect URI that would be used
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  
  return NextResponse.json({
    redirect_uri: redirectUri,
    next_public_app_url: process.env.NEXT_PUBLIC_APP_URL,
    google_redirect_uri_env: process.env.GOOGLE_REDIRECT_URI,
    message: 'Add this EXACT redirect_uri to your Google Cloud Console OAuth credentials'
  })
}
