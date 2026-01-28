import { NextRequest, NextResponse } from 'next/server'

export type BusinessContext = {
  goals: string[]
  initiatives: string[]
  projects: {
    id: string
    name: string
    client?: string
    status: 'active' | 'paused' | 'completed'
  }[]
  updatedAt: number
}

// In-memory store
let context: BusinessContext = {
  goals: [],
  initiatives: [],
  projects: [],
  updatedAt: Date.now()
}

export async function GET() {
  return NextResponse.json(context)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  
  context = {
    goals: body.goals || context.goals,
    initiatives: body.initiatives || context.initiatives,
    projects: body.projects || context.projects,
    updatedAt: Date.now()
  }
  
  return NextResponse.json(context)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  
  if (body.addGoal) {
    context.goals.push(body.addGoal)
  }
  if (body.addInitiative) {
    context.initiatives.push(body.addInitiative)
  }
  if (body.addProject) {
    context.projects.push({
      id: `proj-${Date.now()}`,
      ...body.addProject,
      status: body.addProject.status || 'active'
    })
  }
  
  context.updatedAt = Date.now()
  
  return NextResponse.json(context)
}
