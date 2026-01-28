import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }
  
  return createClient(url, key)
}

// Victor's user ID (the only user)
const VICTOR_USER_ID = process.env.VICTOR_USER_ID

type CyraAction = 
  | { action: 'add_task'; title: string; column?: string; priority?: 'low' | 'medium' | 'high'; description?: string }
  | { action: 'move_task'; task_id: string; to_column: string }
  | { action: 'mark_done'; task_id: string }
  | { action: 'add_note'; content: string }
  | { action: 'get_tasks' }
  | { action: 'get_notes'; unread_only?: boolean }
  | { action: 'update_status'; state: 'idle' | 'working' | 'thinking'; current_task?: string }
  | { action: 'add_log'; log_action: string; details?: string; task_id?: string }
  | { action: 'update_task'; task_id: string; title?: string; description?: string; priority?: 'low' | 'medium' | 'high' }
  | { action: 'delete_task'; task_id: string }

function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')
  const apiKey = process.env.CYRA_API_KEY
  
  if (!apiKey) {
    console.error('CYRA_API_KEY not configured')
    return false
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  
  const providedKey = authHeader.substring(7)
  return providedKey === apiKey
}

async function getUserId(supabase: SupabaseClient): Promise<string | null> {
  // If VICTOR_USER_ID is set, use it directly
  if (VICTOR_USER_ID) {
    return VICTOR_USER_ID
  }
  
  // Otherwise, get the first user (for single-user setup)
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single()
  
  if (error || !data) {
    console.error('Failed to get user ID:', error)
    return null
  }
  
  return data.id
}

export async function POST(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  // Initialize Supabase client at runtime
  let supabase: SupabaseClient
  try {
    supabase = getSupabase()
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
  
  const userId = await getUserId(supabase)
  if (!userId) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }
  
  let body: CyraAction
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }
  
  try {
    switch (body.action) {
      case 'add_task': {
        // Get max position in target column
        const { data: maxPosData } = await supabase
          .from('tasks')
          .select('position')
          .eq('user_id', userId)
          .eq('column_id', body.column || 'inbox')
          .order('position', { ascending: false })
          .limit(1)
          .single()
        
        const maxPosition = maxPosData?.position ?? 0
        
        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title: body.title,
            description: body.description,
            column_id: body.column || 'inbox',
            priority: body.priority || 'medium',
            position: maxPosition + 1,
            created_by: 'cyra'
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Log the action
        await supabase.from('logs').insert({
          user_id: userId,
          action: `Added task: ${body.title}`,
          details: body.description,
          task_id: task.id
        })
        
        return NextResponse.json({ success: true, task })
      }
      
      case 'move_task': {
        // Get max position in target column
        const { data: maxPosData } = await supabase
          .from('tasks')
          .select('position')
          .eq('user_id', userId)
          .eq('column_id', body.to_column)
          .order('position', { ascending: false })
          .limit(1)
          .single()
        
        const maxPosition = maxPosData?.position ?? 0
        
        const { data: task, error } = await supabase
          .from('tasks')
          .update({
            column_id: body.to_column,
            position: maxPosition + 1
          })
          .eq('id', body.task_id)
          .eq('user_id', userId)
          .select()
          .single()
        
        if (error) throw error
        
        // Log the action
        await supabase.from('logs').insert({
          user_id: userId,
          action: `Moved task to ${body.to_column}`,
          task_id: body.task_id
        })
        
        return NextResponse.json({ success: true, task })
      }
      
      case 'mark_done': {
        // Get max position in done column
        const { data: maxPosData } = await supabase
          .from('tasks')
          .select('position')
          .eq('user_id', userId)
          .eq('column_id', 'done')
          .order('position', { ascending: false })
          .limit(1)
          .single()
        
        const maxPosition = maxPosData?.position ?? 0
        
        const { data: task, error } = await supabase
          .from('tasks')
          .update({
            column_id: 'done',
            position: maxPosition + 1
          })
          .eq('id', body.task_id)
          .eq('user_id', userId)
          .select()
          .single()
        
        if (error) throw error
        
        // Log the action
        await supabase.from('logs').insert({
          user_id: userId,
          action: `Completed task: ${task.title}`,
          task_id: body.task_id
        })
        
        return NextResponse.json({ success: true, task })
      }
      
      case 'add_note': {
        const { data: note, error } = await supabase
          .from('notes')
          .insert({
            user_id: userId,
            content: body.content,
            from_user: 'cyra',
            read: false
          })
          .select()
          .single()
        
        if (error) throw error
        
        return NextResponse.json({ success: true, note })
      }
      
      case 'get_tasks': {
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('position')
        
        if (error) throw error
        
        return NextResponse.json({ success: true, tasks })
      }
      
      case 'get_notes': {
        let query = supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (body.unread_only) {
          query = query.eq('read', false)
        }
        
        const { data: notes, error } = await query
        
        if (error) throw error
        
        return NextResponse.json({ success: true, notes })
      }
      
      case 'update_status': {
        const { error } = await supabase
          .from('status')
          .update({
            state: body.state,
            current_task: body.current_task || null
          })
          .eq('user_id', userId)
        
        if (error) throw error
        
        return NextResponse.json({ success: true })
      }
      
      case 'add_log': {
        const { data: log, error } = await supabase
          .from('logs')
          .insert({
            user_id: userId,
            action: body.log_action,
            details: body.details,
            task_id: body.task_id
          })
          .select()
          .single()
        
        if (error) throw error
        
        return NextResponse.json({ success: true, log })
      }
      
      case 'update_task': {
        const updates: Record<string, any> = {}
        if (body.title !== undefined) updates.title = body.title
        if (body.description !== undefined) updates.description = body.description
        if (body.priority !== undefined) updates.priority = body.priority
        
        const { data: task, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', body.task_id)
          .eq('user_id', userId)
          .select()
          .single()
        
        if (error) throw error
        
        return NextResponse.json({ success: true, task })
      }
      
      case 'delete_task': {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', body.task_id)
          .eq('user_id', userId)
        
        if (error) throw error
        
        // Log the action
        await supabase.from('logs').insert({
          user_id: userId,
          action: 'Deleted task',
          task_id: body.task_id
        })
        
        return NextResponse.json({ success: true })
      }
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Cyra API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for quick health check
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Verify Supabase is configured
  try {
    getSupabase()
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 })
  }
  
  return NextResponse.json({
    status: 'ok',
    message: 'Cyra API is running',
    actions: [
      'add_task',
      'move_task', 
      'mark_done',
      'add_note',
      'get_tasks',
      'get_notes',
      'update_status',
      'add_log',
      'update_task',
      'delete_task'
    ]
  })
}
