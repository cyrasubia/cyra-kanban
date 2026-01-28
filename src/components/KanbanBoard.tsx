'use client'

import { useState, useEffect, useCallback } from 'react'

type Task = {
  id: string
  title: string
  description?: string
  column: 'inbox' | 'working' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high'
  project?: string
  createdAt: number
  updatedAt: number
  createdBy: 'victor' | 'cyra'
}

type LogEntry = {
  id: string
  action: string
  details?: string
  timestamp: number
}

type Status = {
  state: 'idle' | 'working' | 'thinking'
  task: string | null
  updatedAt: number
}

type Note = {
  id: string
  content: string
  from: 'victor' | 'cyra'
  read: boolean
  createdAt: number
}

const columns = [
  { id: 'inbox' as const, title: '📥 Inbox', description: 'New tasks from Victor' },
  { id: 'working' as const, title: '⚡ Working', description: 'Cyra is on it' },
  { id: 'review' as const, title: '👀 Review', description: 'Needs approval' },
  { id: 'done' as const, title: '✅ Done', description: 'Completed' },
]

const statusConfig = {
  idle: { emoji: '🟢', label: 'Idle', color: 'text-green-400' },
  working: { emoji: '🟡', label: 'Working', color: 'text-yellow-400' },
  thinking: { emoji: '🔵', label: 'Thinking', color: 'text-blue-400' },
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<Status>({ state: 'idle', task: null, updatedAt: Date.now() })
  const [notes, setNotes] = useState<Note[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newNote, setNewNote] = useState('')
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, logsRes, statusRes, notesRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/logs?limit=20'),
        fetch('/api/status'),
        fetch('/api/notes'),
      ])
      
      const tasksData = await tasksRes.json()
      const logsData = await logsRes.json()
      const statusData = await statusRes.json()
      const notesData = await notesRes.json()
      
      setTasks(tasksData.tasks || [])
      setLogs(logsData.logs || [])
      setStatus(statusData)
      setNotes(notesData.notes || [])
    } catch (e) {
      console.error('Failed to fetch data:', e)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [fetchData])

  const addTask = async (columnId: string) => {
    if (!newTaskTitle.trim()) return
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          column: columnId,
          createdBy: 'victor'
        })
      })
      
      if (res.ok) {
        setNewTaskTitle('')
        setAddingToColumn(null)
        fetchData()
      }
    } catch (e) {
      console.error('Failed to add task:', e)
    }
  }

  const moveTask = async (taskId: string, toColumn: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, column: toColumn })
      })
      fetchData()
    } catch (e) {
      console.error('Failed to move task:', e)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' })
      fetchData()
    } catch (e) {
      console.error('Failed to delete task:', e)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim(), from: 'victor' })
      })
      setNewNote('')
      fetchData()
    } catch (e) {
      console.error('Failed to add note:', e)
    }
  }

  const handleDrop = (columnId: string) => {
    if (draggedTask && draggedTask.column !== columnId) {
      moveTask(draggedTask.id, columnId)
    }
    setDraggedTask(null)
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const statusInfo = statusConfig[status.state]

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">✨ Cyra Command Center</h1>
          <p className="text-slate-500 text-sm">Victor's AI Operations Dashboard</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-lg ${statusInfo.color}`}>
          <span className="text-xl">{statusInfo.emoji}</span>
          <div>
            <div className="font-medium">{statusInfo.label}</div>
            {status.task && <div className="text-xs text-slate-400">{status.task}</div>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Kanban - 8 cols */}
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-4 gap-4">
            {columns.map(column => {
              const columnTasks = tasks.filter(t => t.column === column.id)
              return (
                <div
                  key={column.id}
                  className="bg-slate-900 rounded-xl p-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(column.id)}
                >
                  <div className="mb-3">
                    <div className="font-medium text-sm">{column.title}</div>
                    <div className="text-xs text-slate-500">{columnTasks.length} tasks</div>
                  </div>

                  <div className="space-y-2 min-h-[200px]">
                    {columnTasks.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggedTask(task)}
                        className="bg-slate-800 rounded-lg p-3 cursor-move hover:bg-slate-750 group border border-slate-700 hover:border-cyan-500/50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-sm">{task.title}</span>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex gap-2 mt-2 text-xs text-slate-500">
                          <span>{task.createdBy === 'cyra' ? '🤖' : '👤'}</span>
                          <span>{formatTime(task.createdAt)}</span>
                        </div>
                      </div>
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
        </div>

        {/* Sidebar - 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
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
                    <span className="text-slate-400">{note.from === 'cyra' ? '🤖' : '👤'}</span> {note.content}
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
                logs.slice().reverse().map(log => (
                  <div key={log.id} className="text-xs border-l-2 border-slate-700 pl-3 py-1">
                    <div className="text-slate-300">{log.action}</div>
                    {log.details && <div className="text-slate-500">{log.details}</div>}
                    <div className="text-slate-600">{formatTime(log.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-slate-900 rounded-xl p-4">
            <h3 className="font-medium text-sm mb-3 text-slate-300">📊 Overview</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-cyan-400">{tasks.filter(t => t.column === 'inbox').length}</div>
                <div className="text-xs text-slate-500">Inbox</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-yellow-400">{tasks.filter(t => t.column === 'working').length}</div>
                <div className="text-xs text-slate-500">Working</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">{tasks.filter(t => t.column === 'review').length}</div>
                <div className="text-xs text-slate-500">Review</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">{tasks.filter(t => t.column === 'done').length}</div>
                <div className="text-xs text-slate-500">Done</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
