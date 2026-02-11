import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/cyra/subtasks?taskId=xxx - List subtasks for a task
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      .eq('user_id', user.id)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      .eq('user_id', user.id)
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
        user_id: user.id,
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
