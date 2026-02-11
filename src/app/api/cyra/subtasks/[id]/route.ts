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

// PATCH /api/cyra/subtasks/[id] - Update a subtask
export async function PATCH(
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

    const body = await request.json()
    const { title, completed, position } = body
    const subtaskId = params.id

    // Verify user owns the subtask
    const { data: subtask } = await supabase
      .from('subtasks')
      .select('*')
      .eq('id', subtaskId)
      .eq('user_id', userId)
      .single()

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    // Build update object
    const updates: any = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (completed !== undefined) updates.completed = completed
    if (position !== undefined) updates.position = position

    // Update subtask
    const { data: updatedSubtask, error } = await supabase
      .from('subtasks')
      .update(updates)
      .eq('id', subtaskId)
      .select()
      .single()

    if (error) {
      console.error('Update subtask error:', error)
      return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 })
    }

    return NextResponse.json({ subtask: updatedSubtask })
  } catch (error) {
    console.error('PATCH subtask error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cyra/subtasks/[id] - Delete a subtask
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

    const subtaskId = params.id

    // Verify user owns the subtask
    const { data: subtask } = await supabase
      .from('subtasks')
      .select('*')
      .eq('id', subtaskId)
      .eq('user_id', userId)
      .single()

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    // Delete subtask
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) {
      console.error('Delete subtask error:', error)
      return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE subtask error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
