import { NextRequest, NextResponse } from 'next/server'

export type Task = {
  id: string
  title: string
  description?: string
  column: 'inbox' | 'working' | 'blocked' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high'
  project?: string
  createdAt: number
  updatedAt: number
  createdBy: 'victor' | 'cyra'
  deliverables?: string[]
}

// In-memory store
let tasks: Task[] = []

export async function GET() {
  return NextResponse.json({ tasks })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const newTask: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: body.title,
    description: body.description,
    column: body.column || 'inbox',
    priority: body.priority || 'medium',
    project: body.project,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: body.createdBy || 'cyra',
    deliverables: body.deliverables || []
  }
  
  tasks.push(newTask)
  
  return NextResponse.json(newTask, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body
  
  const taskIndex = tasks.findIndex(t => t.id === id)
  if (taskIndex === -1) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...updates,
    updatedAt: Date.now()
  }
  
  return NextResponse.json(tasks[taskIndex])
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 })
  }
  
  tasks = tasks.filter(t => t.id !== id)
  
  return NextResponse.json({ success: true })
}
