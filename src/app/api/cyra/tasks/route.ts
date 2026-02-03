import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const API_KEY = process.env.CYRA_TASKS_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VICTOR_USER_ID = process.env.VICTOR_USER_ID

function validateApiKey(request: NextRequest) {
  if (!API_KEY) {
    console.error('CYRA_TASKS_API_KEY not configured')
    return false
  }

  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return false

  const provided = header.substring(7).trim()
  return provided === API_KEY
}

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }

  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

async function resolveUserId(supabase: SupabaseClient): Promise<string | null> {
  if (VICTOR_USER_ID) return VICTOR_USER_ID

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single()

  if (error || !data) {
    console.error('Unable to resolve user id for tasks endpoint', error?.message)
    return null
  }

  return data.id
}

type TaskPayload = {
  title?: string
  description?: string
  client_name?: string
  column?: string
  priority?: string
  due_date?: string
  source?: string
}

function normalizePriority(value?: string) {
  if (!value) return 'medium'
  const candidate = value.toLowerCase()
  if (['low', 'medium', 'high'].includes(candidate)) {
    return candidate
  }
  if (candidate.startsWith('med')) return 'medium'
  return 'medium'
}

function normalizeColumn(value?: string) {
  if (!value) return 'inbox'
  return value.trim().toLowerCase()
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: TaskPayload
  try {
    payload = (await request.json()) as TaskPayload
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!payload.title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  let supabase: SupabaseClient
  try {
    supabase = getSupabase()
  } catch (error: any) {
    console.error('Supabase client error', error?.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const userId = await resolveUserId(supabase)
  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const columnId = normalizeColumn(payload.column)
    const priority = normalizePriority(payload.priority)

    const { data: maxPositionData } = await supabase
      .from('tasks')
      .select('position')
      .eq('user_id', userId)
      .eq('column_id', columnId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const maxPosition = maxPositionData?.position ?? 0

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: payload.title.trim(),
        description: payload.description ?? null,
        column_id: columnId,
        priority,
        position: maxPosition + 1,
        project: payload.client_name ?? null,
        created_by: 'cyra'
      })
      .select('id')
      .single()

    if (error || !task) {
      console.error('Supabase insert failed', error?.message)
      throw error ?? new Error('Unknown insert failure')
    }

    return NextResponse.json({ ok: true, id: task.id }, { status: 201 })
  } catch (error: any) {
    console.error('Cyra tasks endpoint error', error.message)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
