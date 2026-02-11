'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Calendar as CalendarIcon, Clock, Repeat, CheckSquare, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import type { Task, RecurrencePattern, RecurrenceConfig } from '@/types/kanban'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (task: Partial<Task>) => Promise<void>
  initialDate?: Date | null
  initialColumn?: string
}

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
  { value: 'high', label: 'High', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500' },
]

const columnOptions = [
  { value: 'inbox', label: '📥 Inbox' },
  { value: 'working', label: '⚡ Working' },
  { value: 'blocked', label: '🙋 Needs Victor' },
  { value: 'review', label: '👀 Review' },
]

const recurrenceOptions: { value: RecurrencePattern; label: string; icon: string }[] = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '📆' },
  { value: 'monthly', label: 'Monthly', icon: '🗓️' },
  { value: 'yearly', label: 'Yearly', icon: '🎉' },
]

const weekDays = [
  { value: 0, label: 'Sun', short: 'S' },
  { value: 1, label: 'Mon', short: 'M' },
  { value: 2, label: 'Tue', short: 'T' },
  { value: 3, label: 'Wed', short: 'W' },
  { value: 4, label: 'Thu', short: 'T' },
  { value: 5, label: 'Fri', short: 'F' },
  { value: 6, label: 'Sat', short: 'S' },
]

// Generate RRULE string from recurrence config
function generateRRule(config: RecurrenceConfig): string {
  const parts: string[] = [`FREQ=${config.pattern.toUpperCase()}`]
  
  if (config.interval && config.interval > 1) {
    parts.push(`INTERVAL=${config.interval}`)
  }
  
  if (config.daysOfWeek && config.daysOfWeek.length > 0) {
    const dayNames = config.daysOfWeek.map(d => {
      const names = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
      return names[d]
    })
    parts.push(`BYDAY=${dayNames.join(',')}`)
  }
  
  if (config.dayOfMonth) {
    parts.push(`BYMONTHDAY=${config.dayOfMonth}`)
  }
  
  if (config.monthOfYear) {
    parts.push(`BYMONTH=${config.monthOfYear}`)
  }
  
  if (config.endDate) {
    parts.push(`UNTIL=${config.endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
  }
  
  if (config.count) {
    parts.push(`COUNT=${config.count}`)
  }
  
  return parts.join(';')
}

export default function CreateTaskModal({ 
  isOpen, 
  onClose, 
  onCreate, 
  initialDate,
  initialColumn = 'inbox'
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [columnId, setColumnId] = useState(initialColumn)
  const [isRecurring, setIsRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [dueTime, setDueTime] = useState('')
  
  // Recurrence state
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [endType, setEndType] = useState<'never' | 'on' | 'after'>('never')
  const [endDate, setEndDate] = useState('')
  const [occurrenceCount, setOccurrenceCount] = useState(10)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setColumnId(initialColumn)
      setIsRecurring(false)
      setRecurrencePattern('weekly')
      setRecurrenceInterval(1)
      setSelectedDays([])
      setEndType('never')
      setEndDate('')
      setOccurrenceCount(10)
      setSaving(false)
      setShowTimePicker(false)
      setDueTime('')
      
      // Set initial date if provided
      if (initialDate) {
        setDueDate(format(initialDate, 'yyyy-MM-dd'))
      } else {
        setDueDate('')
      }
    }
  }, [isOpen, initialDate, initialColumn])

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    
    // Combine date and time if both provided, and append Central timezone
    let finalDueDate = dueDate || null
    if (dueDate && dueTime) {
      finalDueDate = `${dueDate}T${dueTime}:00-06:00` // Central Time (CST)
    } else if (dueDate) {
      finalDueDate = `${dueDate}T00:00:00-06:00` // Default to midnight Central
    }

    // Build task data
    const taskData: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      column_id: columnId,
      event_date: finalDueDate,
    }

    // Add recurrence if enabled
    if (isRecurring && dueDate) {
      const recurrenceConfig: RecurrenceConfig = {
        pattern: recurrencePattern,
        interval: recurrenceInterval,
        daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
        endDate: endType === 'on' && endDate ? new Date(endDate) : undefined,
        count: endType === 'after' ? occurrenceCount : undefined,
      }

      taskData.recurrence_rule = generateRRule(recurrenceConfig)
      taskData.recurrence_pattern = recurrencePattern
      taskData.recurrence_end_date = endType === 'on' ? endDate : null
      taskData.recurrence_count = endType === 'after' ? occurrenceCount : null
    }

    await onCreate(taskData)
    
    setSaving(false)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as any)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">Create New Task</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          {/* Due Date & Time */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              <CalendarIcon className="w-3 h-3 inline mr-1" />
              Due Date {initialDate && `(Pre-filled: ${format(initialDate, 'MMM d, yyyy')})`}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
              />
              {showTimePicker ? (
                <input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                  title="Add time"
                >
                  <Clock className="w-4 h-4" />
                </button>
              )}
            </div>
            {dueDate && (
              <p className="text-xs text-slate-500 mt-1">
                Due: {format(new Date(dueDate + (dueTime ? 'T' + dueTime : 'T00:00:00')), 'EEEE, MMMM d' + (dueTime ? " 'at' h:mm a" : ''))}
              </p>
            )}
          </div>

          {/* Column Selection */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Column</label>
            <select
              value={columnId}
              onChange={e => setColumnId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
            >
              {columnOptions.map(col => (
                <option key={col.value} value={col.value}>{col.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Priority</label>
            <div className="flex gap-2">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value as any)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    priority === opt.value
                      ? `${opt.bg} ${opt.color} border ${opt.border}`
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence Section */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`flex items-center gap-2 text-sm transition-colors w-full ${
                isRecurring ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>Make this a recurring task</span>
              {isRecurring && <CheckSquare className="w-4 h-4 ml-auto" />}
            </button>
            
            {isRecurring && (
              <div className="mt-4 space-y-4">
                {/* Pattern Selection */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Repeat</label>
                  <div className="grid grid-cols-4 gap-2">
                    {recurrenceOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRecurrencePattern(opt.value)}
                        className={`px-2 py-2 rounded-lg text-xs transition-colors ${
                          recurrencePattern === opt.value
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="block text-lg mb-1">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interval */}
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400">Every</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={recurrenceInterval}
                    onChange={e => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center outline-none focus:border-cyan-500"
                  />
                  <span className="text-sm text-slate-400">
                    {recurrencePattern === 'daily' && 'days'}
                    {recurrencePattern === 'weekly' && 'weeks'}
                    {recurrencePattern === 'monthly' && 'months'}
                    {recurrencePattern === 'yearly' && 'years'}
                  </span>
                </div>

                {/* Days of Week (for weekly) */}
                {recurrencePattern === 'weekly' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">On these days</label>
                    <div className="flex gap-1">
                      {weekDays.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            selectedDays.includes(day.value)
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title={day.label}
                        >
                          {day.short}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* End Options */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Ends</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="endType"
                        checked={endType === 'never'}
                        onChange={() => setEndType('never')}
                        className="text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">Never</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="endType"
                        checked={endType === 'on'}
                        onChange={() => setEndType('on')}
                        className="text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">On</span>
                      {endType === 'on' && (
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          min={dueDate}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-500"
                        />
                      )}
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="endType"
                        checked={endType === 'after'}
                        onChange={() => setEndType('after')}
                        className="text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">After</span>
                      {endType === 'after' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={occurrenceCount}
                            onChange={e => setOccurrenceCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white text-center outline-none focus:border-cyan-500"
                          />
                          <span className="text-sm text-slate-400">occurrences</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm text-white transition-colors font-medium"
            >
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>

        {/* Keyboard hint */}
        <div className="px-4 pb-3 text-xs text-slate-500 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Esc</kbd> to close, 
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 mx-1">Cmd+Enter</kbd> to create
        </div>
      </div>
    </div>
  )
}