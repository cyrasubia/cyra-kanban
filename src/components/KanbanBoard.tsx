'use client'

import { useState, useEffect } from 'react'

type Task = {
  id: string
  title: string
  description?: string
  createdAt: number
}

type Column = {
  id: 'backlog' | 'in-progress' | 'done'
  title: string
  tasks: Task[]
}

const STORAGE_KEY = 'cyra-kanban-data'

const defaultColumns: Column[] = [
  { id: 'backlog', title: '📋 Backlog', tasks: [] },
  { id: 'in-progress', title: '🚀 In Progress', tasks: [] },
  { id: 'done', title: '✅ Done', tasks: [] },
]

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(defaultColumns)
  const [draggedTask, setDraggedTask] = useState<{ task: Task; fromColumn: string } | null>(null)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setColumns(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load saved data')
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
  }, [columns])

  const addTask = (columnId: string) => {
    if (!newTaskTitle.trim()) return
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      createdAt: Date.now(),
    }

    setColumns(cols => 
      cols.map(col => 
        col.id === columnId 
          ? { ...col, tasks: [...col.tasks, newTask] }
          : col
      )
    )
    setNewTaskTitle('')
    setAddingToColumn(null)
  }

  const deleteTask = (taskId: string, columnId: string) => {
    setColumns(cols =>
      cols.map(col =>
        col.id === columnId
          ? { ...col, tasks: col.tasks.filter(t => t.id !== taskId) }
          : col
      )
    )
  }

  const handleDragStart = (task: Task, columnId: string) => {
    setDraggedTask({ task, fromColumn: columnId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (toColumnId: string) => {
    if (!draggedTask) return

    setColumns(cols => {
      // Remove from source
      const updated = cols.map(col => {
        if (col.id === draggedTask.fromColumn) {
          return { ...col, tasks: col.tasks.filter(t => t.id !== draggedTask.task.id) }
        }
        return col
      })

      // Add to destination
      return updated.map(col => {
        if (col.id === toColumnId) {
          return { ...col, tasks: [...col.tasks, draggedTask.task] }
        }
        return col
      })
    })

    setDraggedTask(null)
  }

  const updateTaskTitle = (taskId: string, columnId: string, newTitle: string) => {
    setColumns(cols =>
      cols.map(col =>
        col.id === columnId
          ? {
              ...col,
              tasks: col.tasks.map(t =>
                t.id === taskId ? { ...t, title: newTitle } : t
              ),
            }
          : col
      )
    )
    setEditingTask(null)
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-400">✨ Cyra's Kanban</h1>
        <p className="text-slate-400 mt-1">Task tracker for Victor's projects</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(column => (
          <div
            key={column.id}
            className="column"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="column-header flex justify-between items-center">
              <span>{column.title}</span>
              <span className="text-sm text-slate-500">{column.tasks.length}</span>
            </div>

            <div className="space-y-2">
              {column.tasks.map(task => (
                <div
                  key={task.id}
                  className="task-card group"
                  draggable
                  onDragStart={() => handleDragStart(task, column.id)}
                >
                  {editingTask === task.id ? (
                    <input
                      type="text"
                      defaultValue={task.title}
                      autoFocus
                      className="w-full bg-transparent border-b border-cyan-500 outline-none"
                      onBlur={(e) => updateTaskTitle(task.id, column.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateTaskTitle(task.id, column.id, e.currentTarget.value)
                        }
                        if (e.key === 'Escape') {
                          setEditingTask(null)
                        }
                      }}
                    />
                  ) : (
                    <div className="flex justify-between items-start">
                      <span 
                        className="flex-1 cursor-text"
                        onClick={() => setEditingTask(task.id)}
                      >
                        {task.title}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id, column.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {addingToColumn === column.id ? (
              <div className="mt-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:border-cyan-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTask(column.id)
                    if (e.key === 'Escape') {
                      setAddingToColumn(null)
                      setNewTaskTitle('')
                    }
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => addTask(column.id)}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-1 rounded text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setAddingToColumn(null)
                      setNewTaskTitle('')
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-1 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingToColumn(column.id)}
                className="add-task-btn"
              >
                + Add task
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
