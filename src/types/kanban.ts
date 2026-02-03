export type Task = {
  id: string
  title: string
  description?: string
  column_id: string
  priority?: 'low' | 'medium' | 'high'
  project?: string
  position: number
  created_at: string
  updated_at: string
  created_by: 'victor' | 'cyra'
}

export type LogEntry = {
  id: string
  action: string
  details?: string
  created_at: string
}

export type Status = {
  state: 'idle' | 'working' | 'thinking'
  current_task: string | null
  updated_at: string
}

export type Note = {
  id: string
  content: string
  from_user: 'victor' | 'cyra'
  read: boolean
  created_at: string
}
