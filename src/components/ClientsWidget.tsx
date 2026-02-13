'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types/kanban'

interface Client {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed'
  created_at: string
}

interface ClientsWidgetProps {
  tasks: Task[]
  selectedClientId: string | null
  onSelectClient: (clientId: string | null) => void
  userId: string
}

export default function ClientsWidget({ tasks, selectedClientId, onSelectClient, userId }: ClientsWidgetProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (data) {
        setClients(data)
      }
      setLoading(false)
    }

    if (userId) {
      fetchClients()
    }
  }, [userId, supabase])

  // Count tasks per client
  const getClientTaskCount = (clientId: string) => {
    return tasks.filter(t => t.client_id === clientId).length
  }

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">👔 Clients</h3>
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">👔 Clients</h3>
        <div className="text-slate-500 text-xs">No clients yet</div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-400">👔 Clients</h3>
        {selectedClientId && (
          <button
            onClick={() => onSelectClient(null)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {clients.map(client => {
          const taskCount = getClientTaskCount(client.id)
          const isSelected = selectedClientId === client.id
          
          return (
            <button
              key={client.id}
              onClick={() => onSelectClient(isSelected ? null : client.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-purple-600/20 border border-purple-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${
                  isSelected ? 'text-purple-300' : 'text-white'
                }`}>
                  {client.name}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  isSelected
                    ? 'bg-purple-500/30 text-purple-300'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {taskCount}
                </span>
              </div>
              
              {client.description && (
                <p className="text-xs text-slate-400 line-clamp-1 mb-1">
                  {client.description}
                </p>
              )}
              
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  client.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : client.status === 'paused'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-slate-600/20 text-slate-400'
                }`}>
                  {client.status}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
