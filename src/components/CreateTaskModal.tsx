'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Calendar as CalendarIcon, Clock, Repeat, CheckSquare } from 'lucide-react'
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isToday } from 'date-fns'
import type { Task } from '@/types/kanban'

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
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [saving, setSaving] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [dueTime, setDueTime] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setColumnId(initialColumn)
      setIsRecurring(false)
      setRecurringPattern('weekly')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    
    // Combine date and time if both provided
    let finalDueDate = dueDate || null
    if (dueDate && dueTime) {
      finalDueDate = `${dueDate}T${dueTime}`
    }

    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      column_id: columnId,
      due_date: finalDueDate,
      // Store recurring info in metadata for now (will be expanded later)
      ...(isRecurring && { 
        description: `${description.trim() || ''}\n\n[RECURRING:${recurringPattern}]`.trim()
      }),
    })
    
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
        className="bg-slate-900 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
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

          {/* Recurring (placeholder for Task 5) */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`flex items-center gap-2 text-sm transition-colors ${
                isRecurring ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>Make this a recurring task</span>
              {isRecurring && <CheckSquare className="w-4 h-4 ml-auto" />}
            </button>
            
            {isRecurring && (
              <div className="mt-2 flex gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map(pattern => (
                  <button
                    key={pattern}
                    type="button"
                    onClick={() => setRecurringPattern(pattern)}
                    className={`px-3 py-1.5 rounded text-xs capitalize transition-colors ${
                      recurringPattern === pattern
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pattern}
                  </button>
                ))}
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
