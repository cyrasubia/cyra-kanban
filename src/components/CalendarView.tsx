'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, Repeat } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import type { Task } from '@/types/kanban'
import { expandRecurringTasks, getRecurrenceDescription } from '@/lib/recurrence/utils'

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

  const getTasksForDate = (date: Date) => {
    return expandedTasks.filter(task => {
      const dateToUse = task.due_date
      if (dateToUse) {
        const taskDate = new Date(dateToUse)
        return isSameDay(taskDate, date)
      }
      return false
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
        </div>
        <div className="flex items-center gap-2">
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
                {dateTasks.slice(0, 3).map((task, taskIdx) => (
                  <div
                    key={taskIdx}
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
                {dateTasks.length > 3 && (
                  <span className="text-[10px] text-slate-500 pl-1">
                    +{dateTasks.length - 3} more
                  </span>
                )}
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