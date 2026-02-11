'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, Repeat } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import type { Task } from '@/types/kanban'
import { expandRecurringTasks, getRecurrenceDescription } from '@/lib/recurrence/utils'

export interface GoogleCalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  isAllDay: boolean
  location?: string
  hangoutLink?: string
  source: 'google'
}

interface CalendarViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDateClick: (date: Date) => void
}

const priorityColors = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

const priorityBgColors = {
  high: 'bg-red-500/20',
  medium: 'bg-yellow-500/20',
  low: 'bg-green-500/20',
}

export default function CalendarView({ tasks, onTaskClick, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null)
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])
  const [showGoogleEvents, setShowGoogleEvents] = useState(true)
  const [isLoadingGoogleEvents, setIsLoadingGoogleEvents] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // Expand tasks with recurring instances
  const expandedTasks = useMemo(() => {
    const rangeStart = startOfWeek(startOfMonth(currentDate))
    const rangeEnd = endOfWeek(endOfMonth(currentDate))
    return expandRecurringTasks(tasks, rangeStart, rangeEnd)
  }, [tasks, currentDate])

  // Fetch Google Calendar events when month changes
  const fetchGoogleEvents = useCallback(async () => {
    if (!showGoogleEvents) return

    setIsLoadingGoogleEvents(true)
    setGoogleError(null)

    try {
      const rangeStart = startOfWeek(startOfMonth(currentDate))
      const rangeEnd = endOfWeek(endOfMonth(currentDate))
      
      const timeMin = rangeStart.toISOString()
      const timeMax = rangeEnd.toISOString()

      const response = await fetch(`/api/calendar/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      
      if (response.status === 400) {
        // Google Calendar not connected - this is expected
        setGoogleEvents([])
        return
      }
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch Google Calendar events')
      }

      const data = await response.json()
      setGoogleEvents(data.events || [])
    } catch (error: any) {
      console.error('Failed to fetch Google events:', error)
      setGoogleError(error.message)
      setGoogleEvents([])
    } finally {
      setIsLoadingGoogleEvents(false)
    }
  }, [currentDate, showGoogleEvents])

  // Fetch Google events when month changes or toggle is enabled
  useEffect(() => {
    fetchGoogleEvents()
  }, [fetchGoogleEvents])

  const getTasksForDate = (date: Date) => {
    return expandedTasks.filter(task => {
      // Only show tasks that have a due_date set
      if (task.due_date) {
        const taskDate = new Date(task.due_date)
        return isSameDay(taskDate, date)
      }
      return false
    })
  }

  const getGoogleEventsForDate = (date: Date) => {
    if (!showGoogleEvents) return []
    
    return googleEvents.filter(event => {
      const eventDate = new Date(event.start)
      return isSameDay(eventDate, date)
    })
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          {isLoadingGoogleEvents && (
            <span className="text-xs text-slate-500 animate-pulse">Syncing...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Google Calendar Toggle */}
          <button
            onClick={() => setShowGoogleEvents(!showGoogleEvents)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showGoogleEvents
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}
            title="Toggle Google Calendar events"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Calendar</span>
            {showGoogleEvents ? 'On' : 'Off'}
          </button>

          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {googleError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          Google Calendar: {googleError}
        </div>
      )}

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          const dateTasks = getTasksForDate(date)
          const dateGoogleEvents = getGoogleEventsForDate(date)
          const isCurrentMonth = isSameMonth(date, currentDate)
          const isTodayDate = isToday(date)

          return (
            <button
              key={idx}
              onClick={() => onDateClick(date)}
              className={`
                min-h-[100px] p-2 rounded-lg text-left transition-all
                ${isCurrentMonth ? 'bg-slate-800 hover:bg-slate-750' : 'bg-slate-900/50'}
                ${isTodayDate ? 'ring-2 ring-cyan-500' : ''}
              `}
            >
              <div className={`
                text-sm font-medium mb-1
                ${isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}
                ${isTodayDate ? 'text-cyan-400' : ''}
              `}>
                {format(date, 'd')}
              </div>
              
              {/* Task List */}
              <div className="space-y-1">
                {/* Kanban Tasks */}
                {dateTasks.slice(0, 2).map((task, taskIdx) => (
                  <div
                    key={`task-${taskIdx}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      // Click on the original task, not the instance
                      const originalTask = tasks.find(t => t.id === task.id.split('_instance_')[0]) || task
                      onTaskClick(originalTask)
                    }}
                    onMouseEnter={() => setHoveredTask(task)}
                    onMouseLeave={() => setHoveredTask(null)}
                    className={`
                      text-[10px] px-1.5 py-1 rounded truncate cursor-pointer
                      ${priorityBgColors[task.priority || 'medium']}
                      ${task.recurrence_rule ? 'border-l-2 border-purple-500' : ''}
                      hover:opacity-80 transition-opacity
                    `}
                    title={`${task.title}${task.recurrence_rule ? ' (Recurring)' : ''}`}
                  >
                    <span className={priorityColors[task.priority || 'medium'].replace('bg-', 'text-')}>
                      {task.title}
                    </span>
                    {task.recurrence_rule && (
                      <Repeat className="w-2 h-2 inline ml-1 text-purple-400" />
                    )}
                  </div>
                ))}

                {/* Google Calendar Events */}
                {showGoogleEvents && dateGoogleEvents.slice(0, dateTasks.length >= 2 ? 1 : 2).map((event, eventIdx) => (
                  <div
                    key={`google-${eventIdx}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] px-1.5 py-1 rounded truncate bg-blue-500/20 border-l-2 border-blue-500 hover:opacity-80 transition-opacity"
                    title={`${event.title} (Google Calendar)${event.isAllDay ? ' - All day' : ''}`}
                  >
                    <span className="text-blue-400 flex items-center gap-1">
                      <CalendarIcon className="w-2 h-2" />
                      {event.title}
                    </span>
                  </div>
                ))}

                {/* More indicator */}
                {(() => {
                  const totalItems = dateTasks.length + dateGoogleEvents.length
                  const displayedItems = Math.min(dateTasks.length, 2) + Math.min(dateGoogleEvents.length, dateTasks.length >= 2 ? 1 : 2)
                  
                  if (totalItems > displayedItems) {
                    return (
                      <span className="text-[10px] text-slate-500 pl-1">
                        +{totalItems - displayedItems} more
                      </span>
                    )
                  }
                  return null
                })()}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Recurring</span>
        </div>
        {showGoogleEvents && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Google Calendar</span>
          </div>
        )}
      </div>

      {/* Tooltip for hovered task */}
      {hoveredTask && hoveredTask.recurrence_rule && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl z-50">
          <div className="flex items-center gap-2 text-purple-400 text-sm">
            <Repeat className="w-4 h-4" />
            <span>Recurring Task</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {getRecurrenceDescription(hoveredTask)}
          </p>
        </div>
      )}
    </div>
  )
}

// View Toggle Component
export function ViewToggle({ 
  currentView, 
  onViewChange 
}: { 
  currentView: 'kanban' | 'calendar'
  onViewChange: (view: 'kanban' | 'calendar') => void 
}) {
  return (
    <div className="flex bg-slate-800 rounded-lg p-1">
      <button
        onClick={() => onViewChange('kanban')}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
          ${currentView === 'kanban' 
            ? 'bg-cyan-600 text-white' 
            : 'text-slate-400 hover:text-white'}
        `}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Kanban</span>
      </button>
      <button
        onClick={() => onViewChange('calendar')}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
          ${currentView === 'calendar' 
            ? 'bg-cyan-600 text-white' 
            : 'text-slate-400 hover:text-white'}
        `}
      >
        <CalendarIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Calendar</span>
      </button>
    </div>
  )
}
