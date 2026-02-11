import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH /api/cyra/subtasks/[id] - Update a subtask
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, completed, position } = body
    const subtaskId = params.id

    // Verify user owns the subtask
    const { data: subtask } = await supabase
      .from('subtasks')
      .select('*')
      .eq('id', subtaskId)
      .eq('user_id', user.id)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subtaskId = params.id

    // Verify user owns the subtask
    const { data: subtask } = await supabase
      .from('subtasks')
      .select('*')
      .eq('id', subtaskId)
      .eq('user_id', user.id)
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
