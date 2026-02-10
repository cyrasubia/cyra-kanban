export type Task = {
  id: string
  title: string
  description?: string
  column_id: string
  priority?: 'low' | 'medium' | 'high'
  project?: string
  position: number
  due_date?: string | null
  created_at: string
  updated_at: string
  created_by: 'victor' | 'cyra'
  
  // Google Calendar Sync fields
  google_calendar_event_id?: string | null
  google_calendar_sync_status?: 'synced' | 'pending' | 'error' | null
  google_calendar_synced_at?: string | null
  google_calendar_error?: string | null
  
  // Recurrence fields (Task 5)
  recurrence_rule?: string | null  // RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO")
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  recurrence_end_date?: string | null
  recurrence_count?: number | null
  parent_task_id?: string | null  // For recurring instances
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

// Google Calendar Sync types
export type GoogleCalendarSettings = {
  enabled: boolean
  calendar_id: string | null
  sync_enabled: boolean
  last_sync_at: string | null
}

// Recurrence types
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type RecurrenceConfig = {
  pattern: RecurrencePattern
  interval?: number  // Every N days/weeks/months/years
  endDate?: Date
  count?: number  // End after N occurrences
  daysOfWeek?: number[]  // 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number
  monthOfYear?: number
}
