import { NextRequest, NextResponse } from 'next/server'

// In-memory store (will be replaced with proper DB later)
let currentStatus = {
  state: 'idle' as 'idle' | 'working' | 'thinking',
  task: null as string | null,
  updatedAt: Date.now()
}

export async function GET() {
  return NextResponse.json(currentStatus)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  currentStatus = {
    state: body.state || currentStatus.state,
    task: body.task !== undefined ? body.task : currentStatus.task,
    updatedAt: Date.now()
  }
  
  return NextResponse.json(currentStatus)
}
