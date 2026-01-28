import { NextRequest, NextResponse } from 'next/server'

export type LogEntry = {
  id: string
  action: string
  details?: string
  taskId?: string
  timestamp: number
}

// In-memory store
let logs: LogEntry[] = []

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const since = parseInt(searchParams.get('since') || '0')
  
  const filtered = logs
    .filter(log => log.timestamp > since)
    .slice(-limit)
  
  return NextResponse.json({ logs: filtered })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const newLog: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action: body.action,
    details: body.details,
    taskId: body.taskId,
    timestamp: Date.now()
  }
  
  logs.push(newLog)
  
  // Keep only last 500 logs
  if (logs.length > 500) {
    logs = logs.slice(-500)
  }
  
  return NextResponse.json(newLog, { status: 201 })
}
