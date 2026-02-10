'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ClientPanel from '@/components/ClientPanel'
import CalendarView, { ViewToggle } from '@/components/CalendarView'
import CreateTaskModal from '@/components/CreateTaskModal'
import DateDetailModal from '@/components/DateDetailModal'
import { clients } from '@/data/clients'
import type { Task, LogEntry, Status, Note } from '@/types/kanban'

const columns = [
  { id: 'inbox', title: '📥 Inbox', description: 'New tasks' },
  { id: 'working', title: '⚡ Working', description: 'Cyra is on it' },
  { id: 'blocked', title: '🙋 Needs Victor', description: 'Waiting on Victor' },
  { id: 'review', title: '👀 Review', description: 'Needs approval' },
  { id: 'done', title: '✅ Done', description: 'Completed' },
]

const statusConfig = {
  idle: { emoji: '🟢', label: 'Idle', color: 'text-green-400' },
  working: { emoji: '🟡', label: 'Working', color: 'text-yellow-400' },
  thinking: { emoji: '🔵', label: 'Thinking', color: 'text-blue-400' },
}

const priorityColors = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
}

const priorityLabels = {
  high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/20' },
}

// Task Details Modal Component
function TaskModal({
  task,
  onClose,
  onUpdate,
  onDelete,
  onMove
}: {
  task: Task
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onMove: (id: string, column: string) => Promise<void>
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(task.priority || 'medium')
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(task.id, { title, description, priority, due_date: dueDate || null })
    setSaving(false)
    onClose()
  }
  
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await onDelete(task.id)
      onClose()
    }
  }
  
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-xl w-full max-w-lg border border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">{task.created_by === 'cyra' ? '🤖' : '👤'}</span>
            <span className="text-slate-400 text-sm">Task Details</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-cyan-500"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add description..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-cyan-500 resize-none h-24"
            />
          </div>
          
          {/* Due Date */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-cyan-500 text-slate-300"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    priority === p
                      ? `${priorityLabels[p].bg} ${priorityLabels[p].color} border border-current`
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {priorityLabels[p].label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Move to Column */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Move to Column</label>
            <select
              value={task.column_id}
              onChange={e => {
                onMove(task.id, e.target.value)
                onClose()
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-cyan-500"
            >
              {columns.map(col => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </div>
          
          {/* Created Date */}
          <div className="text-xs text-slate-500">
            Created: {formatDate(task.created_at)}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-slate-700">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm transition-colors"
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Task Card Component with hover actions
function TaskCard({ 
  task, 
  onDragStart, 
  onClick,
  onMarkDone,
  onMoveToBlocked,
  onDelete,
  formatTime 
}: {
  task: Task
  onDragStart: () => void
  onClick: () => void
  onMarkDone: () => void
  onMoveToBlocked: () => void
  onDelete: () => void
  formatTime: (timestamp: string) => string
}) {
  const [showActions, setShowActions] = useState(false)
  const priorityClass = task.priority ? priorityColors[task.priority] : 'border-l-slate-600'
  
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onClick}
      className={`task-card bg-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-750 group border-l-4 ${priorityClass} border border-slate-700 hover:border-cyan-500/50 transition-all relative`}
    >
      <div className="flex justify-between items-start">
        <span className="text-sm pr-6">{task.title}</span>
      </div>
      
      {task.description && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex gap-2 mt-2 text-xs text-slate-500 flex-wrap">
        <span>{task.created_by === 'cyra' ? '🤖' : '👤'}</span>
        <span>{formatTime(task.created_at)}</span>
        {task.priority && (
          <span className={`${priorityLabels[task.priority].color} text-[10px] px-1.5 rounded ${priorityLabels[task.priority].bg}`}>
            {task.priority}
          </span>
        )}
        {task.due_date && (
          <span className={`text-[10px] px-1.5 rounded ${new Date(task.due_date) < new Date() ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
            📅 {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      
      {/* Quick Actions - always visible on mobile, hover on desktop */}
      <div 
        className={`absolute top-2 right-2 flex gap-1 ${showActions ? 'opacity-100' : 'opacity-0 lg:opacity-0'} lg:group-hover:opacity-100 transition-opacity`}
        onClick={e => e.stopPropagation()}
      >
        {task.column_id !== 'done' && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkDone(); }}
            className="p-1.5 bg-green-600/80 hover:bg-green-500 rounded text-[10px] text-white transition-colors touch-manipulation"
            title="Mark Done"
          >
            ✓
          </button>
        )}
        {task.column_id !== 'blocked' && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToBlocked(); }}
            className="p-1.5 bg-orange-600/80 hover:bg-orange-500 rounded text-[10px] text-white transition-colors touch-manipulation"
            title="Move to Blocked"
          >
            🙋
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 bg-red-600/80 hover:bg-red-500 rounded text-[10px] text-white transition-colors touch-manipulation"
          title="Delete"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<Status>({ state: 'idle', current_task: null, updated_at: new Date().toISOString() })
  const [notes, setNotes] = useState<Note[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newNote, setNewNote] = useState('')
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban')
  
  // New modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDateDetailModalOpen, setIsDateDetailModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  // Check auth and fetch initial data
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setLoading(false)
    }
    checkAuth()
  }, [router, supabase.auth])

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      const [tasksRes, logsRes, statusRes, notesRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).order('position'),
        supabase.from('logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('status').select('*').eq('user_id', user.id).single(),
        supabase.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      if (tasksRes.data) setTasks(tasksRes.data)
      if (logsRes.data) setLogs(logsRes.data)
      if (statusRes.data) setStatus(statusRes.data)
      if (notesRes.data) setNotes(notesRes.data)
    } catch (e) {
      console.error('Failed to fetch data:', e)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) {
      fetchData()
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
    }
  }, [user, fetchData])

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status', filter: `user_id=eq.${user.id}` }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchData])

  const addTask = async (columnId: string) => {
    if (!newTaskTitle.trim() || !user) return
    
    const maxPosition = Math.max(0, ...tasks.filter(t => t.column_id === columnId).map(t => t.position))
    
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: newTaskTitle.trim(),
      column_id: columnId,
      position: maxPosition + 1,
      priority: 'medium',
      created_by: 'victor'
    })
    
    if (!error) {
      setNewTaskTitle('')
      setAddingToColumn(null)
      fetchData()
    }
  }

  const moveTask = async (taskId: string, toColumn: string) => {
    const maxPosition = Math.max(0, ...tasks.filter(t => t.column_id === toColumn).map(t => t.position))
    
    await supabase.from('tasks').update({ 
      column_id: toColumn,
      position: maxPosition + 1 
    }).eq('id', taskId)
    
    fetchData()
  }

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    fetchData()
  }
  
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    await supabase.from('tasks').update(updates).eq('id', taskId)
    fetchData()
  }
  
  const createTask = async (taskData: Partial<Task>) => {
    if (!user) return
    
    const maxPosition = Math.max(0, ...tasks.filter(t => t.column_id === taskData.column_id).map(t => t.position))
    
    await supabase.from('tasks').insert({
      user_id: user.id,
      title: taskData.title!,
      description: taskData.description,
      column_id: taskData.column_id || 'inbox',
      position: maxPosition + 1,
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date,
      created_by: 'victor'
    })
    
    fetchData()
  }

  const addNote = async () => {
    if (!newNote.trim() || !user) return
    
    await supabase.from('notes').insert({
      user_id: user.id,
      content: newNote.trim(),
      from_user: 'victor'
    })
    
    setNewNote('')
    fetchData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDrop = (columnId: string) => {
    if (draggedTask && draggedTask.column_id !== columnId) {
      moveTask(draggedTask.id, columnId)
    }
    setDraggedTask(null)
  }

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    )
  }

  const statusInfo = statusConfig[status.state]

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6">
      {/* Task Details Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onMove={moveTask}
        />
      )}
      
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-cyan-400">✨ Cyra Command Center</h1>
          <p className="text-slate-500 text-sm">Victor's AI Operations Dashboard</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-900 rounded-lg ${statusInfo.color} flex-1 sm:flex-none`}>
            <span className="text-lg sm:text-xl">{statusInfo.emoji}</span>
            <div className="min-w-0">
              <div className="font-medium text-sm sm:text-base">{statusInfo.label}</div>
              {status.current_task && <div className="text-xs text-slate-400 truncate max-w-[120px] sm:max-w-[200px]">{status.current_task}</div>}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 sm:px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-900 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Content - Kanban or Calendar View */}
        <div className="col-span-12 lg:col-span-8">
          {viewMode === 'calendar' ? (
            /* Calendar View */
            <CalendarView
              tasks={tasks}
              onTaskClick={setSelectedTask}
              onDateClick={(date) => {
                setSelectedDate(date)
                setIsDateDetailModalOpen(true)
              }}
            />
          ) : (
            /* Kanban View */
            <>
              {/* Mobile column selector */}
              <div className="lg:hidden mb-4">
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm"
                  onChange={(e) => {
                    const element = document.getElementById(`column-${e.target.value}`)
                    element?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
                  }}
                >
                  <option value="">Jump to column...</option>
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                </select>
              </div>
              
              {/* Kanban columns - horizontal scroll on mobile, grid on desktop */}
              <div className="kanban-container">
                {columns.map(column => {
                  const columnTasks = tasks.filter(t => t.column_id === column.id)
                  return (
                    <div
                      key={column.id}
                      id={`column-${column.id}`}
                      className="kanban-column bg-slate-900 rounded-xl p-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(column.id)}
                >
                  <div className="mb-3">
                    <div className="font-medium text-sm">{column.title}</div>
                    <div className="text-xs text-slate-500">{columnTasks.length} tasks</div>
                  </div>

                  <div className="space-y-2 min-h-[200px]">
                    {columnTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={() => setDraggedTask(task)}
                        onClick={() => setSelectedTask(task)}
                        onMarkDone={() => moveTask(task.id, 'done')}
                        onMoveToBlocked={() => moveTask(task.id, 'blocked')}
                        onDelete={() => {
                          if (confirm('Delete this task?')) {
                            deleteTask(task.id)
                          }
                        }}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>

                  {column.id === 'inbox' && (
                    addingToColumn === column.id ? (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Task description..."
                          autoFocus
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-cyan-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addTask(column.id)
                            if (e.key === 'Escape') setAddingToColumn(null)
                          }}
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => addTask(column.id)} className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-1 rounded text-sm">Add</button>
                          <button onClick={() => setAddingToColumn(null)} className="flex-1 bg-slate-700 py-1 rounded text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingToColumn(column.id)}
                        className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-cyan-400 border border-dashed border-slate-700 hover:border-cyan-500 rounded-lg transition-colors"
                      >
                        + Add task
                      </button>
                    )
                  )}
                </div>
              )
            })}
              </div>
            </>
          )}
        </div>

        {/* Sidebar - full width on mobile, 4 cols on desktop */}
        <div className="col-span-12 lg:col-span-4 space-y-4 mt-6 lg:mt-0">
          <ClientPanel clients={clients} tasks={tasks} />

          {/* Quick Note */}
          <div className="bg-slate-900 rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3 text-slate-300">📝 Quick Note to Cyra</h3>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Leave instructions, context, or requests..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-cyan-500 resize-none h-20"
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim()}
              className="mt-2 w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 py-2 rounded-lg text-sm transition-colors"
            >
              Send Note
            </button>
            
            {notes.filter(n => !n.read).length > 0 && (
              <div className="mt-3 space-y-2">
                {notes.filter(n => !n.read).slice(0, 3).map(note => (
                  <div key={note.id} className="text-xs bg-slate-800 p-2 rounded border-l-2 border-cyan-500">
                    <span className="text-slate-400">{note.from_user === 'cyra' ? '🤖' : '👤'}</span> {note.content}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Log */}
          <div className="bg-slate-900 rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3 text-slate-300">📋 Action Log</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500">No actions logged yet</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="text-xs border-l-2 border-slate-700 pl-3 py-1">
                    <div className="text-slate-300">{log.action}</div>
                    {log.details && <div className="text-slate-500">{log.details}</div>}
                    <div className="text-slate-600">{formatTime(log.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-slate-900 rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3 text-slate-300">📊 Overview</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-800 rounded-lg p-2">
                <div className="text-xl font-bold text-cyan-400">{tasks.filter(t => t.column_id === 'inbox').length}</div>
                <div className="text-xs text-slate-500">Inbox</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-2">
                <div className="text-xl font-bold text-yellow-400">{tasks.filter(t => t.column_id === 'working').length}</div>
                <div className="text-xs text-slate-500">Working</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-2">
                <div className="text-xl font-bold text-orange-400">{tasks.filter(t => t.column_id === 'blocked').length}</div>
                <div className="text-xs text-slate-500">Needs You</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-2">
                <div className="text-xl font-bold text-purple-400">{tasks.filter(t => t.column_id === 'review').length}</div>
                <div className="text-xs text-slate-500">Review</div>
              </div>
            </div>
            <div className="mt-2 bg-slate-800 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-green-400">{tasks.filter(t => t.column_id === 'done').length}</div>
              <div className="text-xs text-slate-500">Done</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createTask}
        initialDate={selectedDate}
        initialColumn="inbox"
      />
      
      {/* Date Detail Modal */}
      <DateDetailModal
        isOpen={isDateDetailModalOpen}
        onClose={() => setIsDateDetailModalOpen(false)}
        date={selectedDate}
        tasks={tasks}
        onTaskClick={(task) => {
          setIsDateDetailModalOpen(false)
          setSelectedTask(task)
        }}
        onCreateTask={(date) => {
          setIsDateDetailModalOpen(false)
          setSelectedDate(date)
          setIsCreateModalOpen(true)
        }}
        onMarkDone={(taskId) => moveTask(taskId, 'done')}
        onMoveToColumn={(taskId, columnId) => moveTask(taskId, columnId)}
      />
    </div>
  )
}
