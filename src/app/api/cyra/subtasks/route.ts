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

// GET /api/cyra/subtasks?taskId=xxx - List subtasks for a task
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

    // Fetch subtasks
    const { data: subtasks, error } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Fetch subtasks error:', error)
      return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 })
    }

    return NextResponse.json({ subtasks })
  } catch (error) {
    console.error('GET subtasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cyra/subtasks - Create a new subtask
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

    const body = await request.json()
    const { taskId, title, position } = body

    if (!taskId || !title) {
      return NextResponse.json({ error: 'taskId and title required' }, { status: 400 })
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

    // Get next position if not provided
    let subtaskPosition = position
    if (subtaskPosition === undefined) {
      const { data: maxPositionResult } = await supabase
        .from('subtasks')
        .select('position')
        .eq('task_id', taskId)
        .order('position', { ascending: false })
        .limit(1)
        .single()
      
      subtaskPosition = maxPositionResult ? maxPositionResult.position + 1 : 0
    }

    // Create subtask
    const { data: subtask, error } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        user_id: userId,
        title,
        position: subtaskPosition,
        completed: false
      })
      .select()
      .single()

    if (error) {
      console.error('Create subtask error:', error)
      return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 })
    }

    return NextResponse.json({ subtask })
  } catch (error) {
    console.error('POST subtask error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
