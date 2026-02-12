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

// GET /api/cyra/attachments?taskId=xxx - List attachments for a task
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    // Verify user owns the task
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Fetch attachments
    const { data: attachments, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch attachments error:', error)
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 })
    }

    // Generate signed URLs for each attachment
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (attachment) => {
        const { data } = await supabase.storage
          .from('task-attachments')
          .createSignedUrl(attachment.file_path, 3600) // 1 hour expiry
        
        return {
          ...attachment,
          url: data?.signedUrl || null
        }
      })
    )

    return NextResponse.json({ attachments: attachmentsWithUrls })
  } catch (error) {
    console.error('GET attachments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cyra/attachments - Upload a new attachment
export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const taskId = formData.get('taskId') as string
    const file = formData.get('file') as File

    if (!taskId || !file) {
      return NextResponse.json({ error: 'taskId and file required' }, { status: 400 })
    }

    // Verify user owns the task
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Check if bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'task-attachments')
    
    if (!bucketExists) {
      await supabase.storage.createBucket('task-attachments', {
        public: false,
        fileSizeLimit: maxSize
      })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${userId}/${taskId}/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Save attachment record to database
    const { data: attachment, error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('task-attachments').remove([filePath])
      return NextResponse.json({ error: 'Failed to save attachment record' }, { status: 500 })
    }

    // Generate signed URL
    const { data: urlData } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(filePath, 3600)

    return NextResponse.json({
      attachment: {
        ...attachment,
        url: urlData?.signedUrl || null
      }
    })
  } catch (error) {
    console.error('POST attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
