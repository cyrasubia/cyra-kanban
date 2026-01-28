import { NextRequest, NextResponse } from 'next/server'

export type Note = {
  id: string
  content: string
  from: 'victor' | 'cyra'
  read: boolean
  createdAt: number
}

// In-memory store
let notes: Note[] = []

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  
  const filtered = unreadOnly ? notes.filter(n => !n.read) : notes
  
  return NextResponse.json({ notes: filtered })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const newNote: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: body.content,
    from: body.from || 'victor',
    read: false,
    createdAt: Date.now()
  }
  
  notes.push(newNote)
  
  return NextResponse.json(newNote, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, read } = body
  
  const noteIndex = notes.findIndex(n => n.id === id)
  if (noteIndex === -1) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }
  
  notes[noteIndex].read = read
  
  return NextResponse.json(notes[noteIndex])
}
