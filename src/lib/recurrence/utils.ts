import { RRule, RRuleSet, rrulestr } from 'rrule'
import { Task } from '@/types/kanban'
import { addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

// Parse RRULE string and generate occurrences
export function parseRRule(rruleString: string, dtStart: Date): RRule | null {
  try {
    // Ensure the rule has FREQ
    if (!rruleString.includes('FREQ=')) {
      rruleString = `FREQ=DAILY;${rruleString}`
    }
    
    return rrulestr(`DTSTART:${dtStart.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nRRULE:${rruleString}`)
  } catch (error) {
    console.error('Failed to parse RRULE:', error)
    return null
  }
}

// Generate recurring task instances for a date range
export function generateRecurringInstances(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): Array<{ date: Date; task: Task }> {
  if (!task.recurrence_rule || !task.event_date) {
    return []
  }

  const rrule = parseRRule(task.recurrence_rule, new Date(task.event_date))
  if (!rrule) return []

  const occurrences = rrule.between(rangeStart, rangeEnd, true)
  
  return occurrences.map(date => ({
    date,
    task: {
      ...task,
      event_date: date.toISOString(),
      // Mark as instance
      id: `${task.id}_instance_${date.toISOString().split('T')[0]}`
    }
  }))
}

// Get next occurrence after a given date
export function getNextOccurrence(task: Task, afterDate: Date = new Date()): Date | null {
  if (!task.recurrence_rule || !task.event_date) {
    return null
  }

  const rrule = parseRRule(task.recurrence_rule, new Date(task.event_date))
  if (!rrule) return null

  const next = rrule.after(afterDate, false)
  return next || null
}

// Get all occurrences for a month
export function getMonthOccurrences(
  task: Task,
  year: number,
  month: number  // 0-11
): Date[] {
  if (!task.recurrence_rule || !task.event_date) {
    return []
  }

  const rrule = parseRRule(task.recurrence_rule, new Date(task.event_date))
  if (!rrule) return []

  const start = startOfMonth(new Date(year, month, 1))
  const end = endOfMonth(start)

  return rrule.between(start, end, true)
}

// Check if a task has recurrence ended
export function hasRecurrenceEnded(task: Task): boolean {
  if (!task.recurrence_rule) return true

  // Check end date
  if (task.recurrence_end_date) {
    return new Date() > new Date(task.recurrence_end_date)
  }

  // Check count - would need to track occurrences
  // For now, we rely on the RRULE itself
  const rrule = parseRRule(task.recurrence_rule, new Date(task.event_date || new Date()))
  if (!rrule) return true

  const next = rrule.after(new Date(), false)
  return !next
}

// Generate human-readable recurrence description
export function getRecurrenceDescription(task: Task): string {
  if (!task.recurrence_pattern) return ''

  const parts: string[] = []
  
  switch (task.recurrence_pattern) {
    case 'daily':
      parts.push('Daily')
      break
    case 'weekly':
      parts.push('Weekly')
      break
    case 'monthly':
      parts.push('Monthly')
      break
    case 'yearly':
      parts.push('Yearly')
      break
  }

  if (task.recurrence_end_date) {
    parts.push(`until ${new Date(task.recurrence_end_date).toLocaleDateString()}`)
  } else if (task.recurrence_count) {
    parts.push(`for ${task.recurrence_count} times`)
  }

  return parts.join(' ')
}

// Expand tasks with their recurring instances for calendar view
export function expandRecurringTasks(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date
): Task[] {
  const expanded: Task[] = []
  const regularTasks: Task[] = []
  const recurringTasks: Task[] = []

  // Separate recurring and non-recurring tasks
  tasks.forEach(task => {
    if (task.recurrence_rule && task.event_date) {
      recurringTasks.push(task)
    } else {
      regularTasks.push(task)
    }
  })

  // Add regular tasks
  expanded.push(...regularTasks)

  // Generate instances for recurring tasks
  recurringTasks.forEach(task => {
    // Add the original task if it's in range
    const originalDate = new Date(task.event_date!)
    if (isWithinInterval(originalDate, { start: rangeStart, end: rangeEnd })) {
      expanded.push(task)
    }

    // Generate recurring instances
    const instances = generateRecurringInstances(task, rangeStart, rangeEnd)
    instances.forEach(({ task: instanceTask }) => {
      expanded.push(instanceTask)
    })
  })

  return expanded
}