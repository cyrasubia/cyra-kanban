'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { X, Plus, Calendar, Clock, ArrowRight, CheckCircle2, Circle, AlertCircle, ExternalLink, Video } from 'lucide-react'
import { format, isSameDay, isPast, isToday, parseISO } from 'date-fns'
import type { Task } from '@/types/kanban'
import { GoogleCalendarEvent } from './CalendarView'

interface DateDetailModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onCreateTask: (date: Date) => void
  onMarkDone: (taskId: string) => void
  onMoveToColumn: (taskId: string, columnId: string) => void
}

const columnLabels: Record<string, { label: string; color: string; bg: string }> = {
  inbox: { label: 'Inbox', color: 'text-slate-400', bg: 'bg-slate-800' },
  working: { label: 'Working', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  blocked: { label: 'Needs Victor', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  review: { label: 'Review', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  done: { label: 'Done', color: 'text-green-400', bg: 'bg-green-500/20' },
}

const priorityIcons = {
  high: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  medium: <Circle className="w-3.5 h-3.5 text-yellow-400" />,
  low: <Circle className="w-3.5 h-3.5 text-green-400" />,
}

export default function DateDetailModal({ 
  isOpen, 
  onClose, 
  date, 
  tasks, 
  onTaskClick, 
  onCreateTask,
  onMarkDone,
  onMoveToColumn
}: DateDetailModalProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [showGoogleEvents, setShowGoogleEvents] = useState(true)
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])
  const [isLoadingGoogleEvents, setIsLoadingGoogleEvents] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)

  // Fetch Google Calendar events for the selected date
  const fetchGoogleEvents = useCallback(async () => {
    if (!date || !showGoogleEvents) {
      setGoogleEvents([])
      return
    }

    setIsLoadingGoogleEvents(true)
    setGoogleError(null)

    try {
      // Create a 24-hour range for the selected date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const timeMin = startOfDay.toISOString()
      const timeMax = endOfDay.toISOString()

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
  }, [date, showGoogleEvents])

  // Fetch Google events when date changes or toggle is enabled
  useEffect(() => {
    fetchGoogleEvents()
  }, [fetchGoogleEvents])

  const dateTasks = useMemo(() => {
    if (!date) return []
    return tasks.filter(task => {
      // Only show tasks that have a event_date set
      if (!task.event_date) return false
      const taskDate = new Date(task.event_date)
      return isSameDay(taskDate, date)
    }).sort((a, b) => {
      // Sort by priority (high first), then by column (done last)
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const aPriority = priorityOrder[a.priority || 'medium']
      const bPriority = priorityOrder[b.priority || 'medium']
      if (aPriority !== bPriority) return aPriority - bPriority
      if (a.column_id === 'done' && b.column_id !== 'done') return 1
      if (b.column_id === 'done' && a.column_id !== 'done') return -1
      return 0
    })
  }, [tasks, date])

  const filteredTasks = useMemo(() => {
    if (filter === 'pending') return dateTasks.filter(t => t.column_id !== 'done')
    if (filter === 'done') return dateTasks.filter(t => t.column_id === 'done')
    return dateTasks
  }, [dateTasks, filter])

  const stats = useMemo(() => ({
    total: dateTasks.length,
    pending: dateTasks.filter(t => t.column_id !== 'done').length,
    done: dateTasks.filter(t => t.column_id === 'done').length,
    highPriority: dateTasks.filter(t => t.priority === 'high' && t.column_id !== 'done').length,
    googleEvents: googleEvents.length
  }), [dateTasks, googleEvents])

  const formatEventTime = (event: GoogleCalendarEvent) => {
    if (event.isAllDay) {
      return 'All day'
    }
    const start = new Date(event.start)
    const end = new Date(event.end)
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }

  if (!isOpen || !date) return null

  const isPastDate = isPast(date) && !isToday(date)
  const isTodayDate = isToday(date)

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-4 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">
                {isTodayDate ? 'Today' : format(date, 'EEEE')}
              </h2>
            </div>
            <p className="text-slate-400 text-sm ml-7">
              {format(date, 'MMMM d, yyyy')}
              {isPastDate && <span className="text-orange-400 ml-2">(Past)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCreateTask(date)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2 p-4 border-b border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-white">{stats.total}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Tasks</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Pending</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-400">{stats.done}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Done</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-400">{stats.highPriority}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">High</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-blue-400">{stats.googleEvents}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Google</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 p-3 border-b border-slate-800">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f} ({f === 'all' ? stats.total : f === 'pending' ? stats.pending : stats.done})
            </button>
          ))}
          
          {/* Google Calendar Toggle */}
          <div className="flex-1" />
          <button
            onClick={() => setShowGoogleEvents(!showGoogleEvents)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showGoogleEvents
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Google {showGoogleEvents ? 'On' : 'Off'}
          </button>
        </div>

        {/* Error Message */}
        {googleError && (
          <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            Google Calendar: {googleError}
          </div>
        )}

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Google Calendar Events Section */}
          {showGoogleEvents && googleEvents.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Google Calendar Events
              </h3>
              <div className="space-y-2">
                {googleEvents.map(event => (
                  <div
                    key={event.id}
                    className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 hover:bg-blue-500/15 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Calendar className="w-4 h-4 text-blue-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {event.title}
                        </p>
                        {event.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            {formatEventTime(event)}
                          </span>
                          {event.hangoutLink && (
                            <a
                              href={event.hangoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1 hover:bg-green-500/30 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Video className="w-3 h-3" />
                              Meet
                            </a>
                          )}
                        </div>
                        {event.location && (
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kanban Tasks Section */}
          {filteredTasks.length === 0 && (!showGoogleEvents || googleEvents.length === 0) ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No tasks for this date</p>
              <button
                onClick={() => onCreateTask(date)}
                className="mt-3 text-cyan-400 text-sm hover:underline"
              >
                Create a task
              </button>
            </div>
          ) : (
            <>
              {filteredTasks.length > 0 && (
                <div>
                  {filteredTasks.length > 0 && googleEvents.length > 0 && (
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                      Kanban Tasks
                    </h3>
                  )}
                  <div className="space-y-2">
                    {filteredTasks.map(task => {
                      const isDone = task.column_id === 'done'
                      const columnInfo = columnLabels[task.column_id] || columnLabels.inbox
                      
                      return (
                        <div
                          key={task.id}
                          className={`group bg-slate-800/50 hover:bg-slate-800 rounded-lg p-3 border border-transparent hover:border-slate-600 transition-all cursor-pointer ${
                            isDone ? 'opacity-60' : ''
                          }`}
                          onClick={() => onTaskClick(task)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Priority/Status Icon */}
                            <div className="mt-0.5">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              ) : (
                                priorityIcons[task.priority || 'medium']
                              )}
                            </div>
                            
                            {/* Task Content */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${columnInfo.bg} ${columnInfo.color}`}>
                                  {columnInfo.label}
                                </span>
                                {task.event_date && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(task.event_date), 'h:mm a')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isDone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onMarkDone(task.id)
                                  }}
                                  className="p-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded transition-colors"
                                  title="Mark done"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              {task.column_id !== 'working' && !isDone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onMoveToColumn(task.id, 'working')
                                  }}
                                  className="p-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded transition-colors"
                                  title="Start working"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-2">
          <button
            onClick={() => onCreateTask(date)}
            className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create New Task
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
