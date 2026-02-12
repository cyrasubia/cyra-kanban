import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const API_KEY = process.env.CYRA_TASKS_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const VICTOR_USER_ID = process.env.VICTOR_USER_ID || '14c09ffa-2671-4e78-8220-4dde396fdf52'

function validateApiKey(request: NextRequest) {
  if (!API_KEY) return false
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return false
  const provided = header.substring(7).trim()
  return provided === API_KEY
}

function getServiceSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })
}

// DELETE /api/cyra/attachments/[id] - Delete an attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check for API key auth first
    const isApiKey = validateApiKey(request)
    let supabase: SupabaseClient
    let userId: string
    
    if (isApiKey) {
      supabase = getServiceSupabase()
      userId = VICTOR_USER_ID
    } else {
      supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    }

    const attachmentId = params.id

    // Fetch attachment to verify ownership and get file path
    const { data: attachment } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('user_id', userId)
      .single()

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('task-attachments')
      .remove([attachment.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue anyway to delete database record
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
