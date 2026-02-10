import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Get the redirect URI that would be used
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/auth/google/callback`
  
  return NextResponse.json({
    redirect_uri: redirectUri,
    next_public_app_url: process.env.NEXT_PUBLIC_APP_URL,
    google_redirect_uri_env: process.env.GOOGLE_REDIRECT_URI,
    has_google_client_id: !!process.env.GOOGLE_CLIENT_ID,
    has_google_client_secret: !!process.env.GOOGLE_CLIENT_SECRET,
    google_client_id_prefix: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : null,
    message: 'Add this EXACT redirect_uri to your Google Cloud Console OAuth credentials'
  })
}
