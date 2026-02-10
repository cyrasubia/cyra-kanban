import { google, calendar_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { Task } from '@/types/kanban'
import { createClient } from '@supabase/supabase-js'

// Initialize OAuth2 client
export function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

// Generate Google OAuth URL for authorization
export function getGoogleAuthUrl(state?: string): string {
  const oauth2Client = getOAuthClient()
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true,
    prompt: 'consent',
    state
  })
}

// Exchange code for tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// Create Calendar API client with user's tokens
export async function getCalendarClient(accessToken: string, refreshToken?: string): Promise<calendar_v3.Calendar> {
  const oauth2Client = getOAuthClient()
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

// Refresh access token if needed
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials.access_token!
}

// Create or update calendar event from task
export async function syncTaskToCalendar(
  task: Task,
  calendar: calendar_v3.Calendar,
  calendarId: string = 'primary'
): Promise<string> {
  if (!task.due_date) {
    throw new Error('Task has no due date')
  }

  // Parse due date
  const dueDate = new Date(task.due_date)
  const isAllDay = !task.due_date.includes('T')

  // Build event data
  const event: calendar_v3.Schema$Event = {
    summary: task.title,
    description: task.description || undefined,
    
    // Add recurrence rule if present
    recurrence: task.recurrence_rule ? [`RRULE:${task.recurrence_rule}`] : undefined,
    
    // Set start/end time
    ...(isAllDay ? {
      start: { date: dueDate.toISOString().split('T')[0] },
      end: { date: dueDate.toISOString().split('T')[0] }
    } : {
      start: { dateTime: dueDate.toISOString() },
      end: { dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString() } // Default 1 hour duration
    }),
    
    // Add color based on priority
    colorId: getPriorityColorId(task.priority),
    
    // Store task ID in extended properties for sync back
    extendedProperties: {
      private: {
        kanban_task_id: task.id,
        kanban_source: 'cyra-kanban'
      }
    }
  }

  let response: calendar_v3.Schema$Event

  if (task.google_calendar_event_id) {
    // Update existing event
    const updateResponse = await calendar.events.patch({
      calendarId,
      eventId: task.google_calendar_event_id,
      requestBody: event
    })
    response = updateResponse.data
  } else {
    // Create new event
    const createResponse = await calendar.events.insert({
      calendarId,
      requestBody: event
    })
    response = createResponse.data
  }

  return response.id!
}

// Delete calendar event
export async function deleteCalendarEvent(
  eventId: string,
  calendar: calendar_v3.Calendar,
  calendarId: string = 'primary'
): Promise<void> {
  await calendar.events.delete({
    calendarId,
    eventId
  })
}

// Get priority color mapping for Google Calendar
function getPriorityColorId(priority?: string): string | undefined {
  // Google Calendar color IDs: 1-11
  // 11 = Tomato (red) - high
  // 5 = Banana (yellow) - medium
  // 2 = Sage (green) - low
  switch (priority) {
    case 'high': return '11'  // Red
    case 'medium': return '5' // Yellow
    case 'low': return '2'    // Green
    default: return undefined
  }
}

// Fetch user's calendar list
export async function getCalendarList(
  calendar: calendar_v3.Calendar
): Promise<calendar_v3.Schema$CalendarListEntry[]> {
  const response = await calendar.calendarList.list()
  return response.data.items || []
}

// Sync calendar event back to task (if event was modified in Google Calendar)
export async function syncCalendarEventToTask(
  event: calendar_v3.Schema$Event,
  supabaseClient: any
): Promise<void> {
  const taskId = event.extendedProperties?.private?.kanban_task_id
  if (!taskId) return

  // Determine due date from event
  let dueDate: string | null = null
  if (event.start?.dateTime) {
    dueDate = event.start.dateTime
  } else if (event.start?.date) {
    dueDate = event.start.date
  }

  // Update task with event data
  await supabaseClient
    .from('tasks')
    .update({
      title: event.summary || undefined,
      description: event.description || undefined,
      due_date: dueDate,
      google_calendar_synced_at: new Date().toISOString()
    })
    .eq('id', taskId)
}