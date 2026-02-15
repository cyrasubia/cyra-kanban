'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types/kanban'

interface Client {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed'
  created_at: string
}

interface NavigationSidebarProps {
  tasks: Task[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  userId: string
}

type CategoryType = 'client' | 'personal' | 'openclaw' | 'housefly' | 'initiative' | 'event' | 'insiderclicks' | 'insiderclicks-business' | 'victoryhomebuyers'

// Individual category button component - defined outside to prevent re-creation
function CategoryButton({ 
  id, 
  label, 
  icon, 
  count, 
  isSelected,
  onClick
}: { 
  id: string
  label: string
  icon: string
  count: number
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-150 flex items-center justify-between ${
        isSelected
          ? 'bg-cyan-600/20 border border-cyan-500/50 text-cyan-300'
          : 'text-slate-300 border border-transparent hover:bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm flex-shrink-0">{icon}</span>
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      {count > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
          isSelected
            ? 'bg-cyan-500/30 text-cyan-200'
            : 'bg-slate-700 text-slate-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function NavigationSidebar({ tasks, selectedCategory, onSelectCategory, userId }: NavigationSidebarProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })
      
      if (data) {
        setClients(data)
      }
      setLoading(false)
    }

    if (userId) {
      fetchClients()
    }
  }, [userId, supabase])

  // Memoize active tasks to prevent recalculation on every render
  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks])

  // Memoize category counts to prevent recalculation on hover
  const categoryCounts = useMemo(() => ({
    personal: activeTasks.filter(t => t.task_type === 'task' || (!t.task_type && !t.product_id && !t.client_id)).length,
    insiderclicks: activeTasks.filter(t => t.client_id).length,
    'insiderclicks-business': activeTasks.filter(t => t.product_id && t.product?.name?.toLowerCase().includes('insider clicks')).length,
    victoryhomebuyers: activeTasks.filter(t => t.product_id && t.product?.name?.toLowerCase().includes('victory home buyers')).length,
    openclaw: activeTasks.filter(t => t.product_id && t.product?.name?.toLowerCase().includes('openclaw')).length,
    housefly: activeTasks.filter(t => t.product_id && t.product?.name?.toLowerCase().includes('house fly')).length,
    initiative: activeTasks.filter(t => t.task_type === 'initiative').length,
    event: activeTasks.filter(t => t.task_type === 'event').length,
  }), [activeTasks])

  // Memoize client counts
  const clientCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    clients.forEach(client => {
      counts[client.id] = activeTasks.filter(t => t.client_id === client.id).length
    })
    return counts
  }, [activeTasks, clients])

  // Count tasks per category (only active, non-archived tasks)
  const getCategoryCount = (categoryType: CategoryType, categoryValue?: string) => {
    if (categoryType === 'client' && categoryValue) {
      return clientCounts[categoryValue] || 0
    }
    return categoryCounts[categoryType as keyof typeof categoryCounts] || 0
  }

  // Simple click handler - no useCallback needed for simple state updates
  const handleCategoryClick = (id: string) => {
    // Toggle: if already selected, clear it; otherwise select it
    onSelectCategory(selectedCategory === id ? null : id)
  }

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl p-3 h-full">
        <div className="text-slate-500 text-xs">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-xl p-3 h-full overflow-y-auto">
      {/* Clear Filter */}
      {selectedCategory && (
        <button
          onClick={() => onSelectCategory(null)}
          className="w-full mb-3 px-3 py-2 text-xs text-cyan-400 hover:text-cyan-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          ✕ Clear Filter
        </button>
      )}
      
      {/* Categories Section */}
      <div className="mb-4">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
          Categories
        </h3>
        <div className="space-y-1">
          <CategoryButton
            id="personal"
            label="Personal"
            icon="👤"
            count={getCategoryCount('personal')}
            isSelected={selectedCategory === 'personal'}
            onClick={() => handleCategoryClick('personal')}
          />
          <CategoryButton
            id="initiative"
            label="Initiatives"
            icon="🎯"
            count={getCategoryCount('initiative')}
            isSelected={selectedCategory === 'initiative'}
            onClick={() => handleCategoryClick('initiative')}
          />
          <CategoryButton
            id="event"
            label="Events"
            icon="📅"
            count={getCategoryCount('event')}
            isSelected={selectedCategory === 'event'}
            onClick={() => handleCategoryClick('event')}
          />
        </div>
      </div>

      {/* Businesses Section */}
      <div className="mb-4">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
          Businesses
        </h3>
        <div className="space-y-1">
          <CategoryButton
            id="insiderclicks"
            label="IC (Clients)"
            icon="💼"
            count={getCategoryCount('insiderclicks')}
            isSelected={selectedCategory === 'insiderclicks'}
            onClick={() => handleCategoryClick('insiderclicks')}
          />
          <CategoryButton
            id="insiderclicks-business"
            label="IC Marketing"
            icon="🏢"
            count={getCategoryCount('insiderclicks-business')}
            isSelected={selectedCategory === 'insiderclicks-business'}
            onClick={() => handleCategoryClick('insiderclicks-business')}
          />
          <CategoryButton
            id="victoryhomebuyers"
            label="Victory Home Buyers"
            icon="🏘️"
            count={getCategoryCount('victoryhomebuyers')}
            isSelected={selectedCategory === 'victoryhomebuyers'}
            onClick={() => handleCategoryClick('victoryhomebuyers')}
          />
          <CategoryButton
            id="housefly"
            label="House Fly"
            icon="🏠"
            count={getCategoryCount('housefly')}
            isSelected={selectedCategory === 'housefly'}
            onClick={() => handleCategoryClick('housefly')}
          />
          <CategoryButton
            id="openclaw"
            label="OpenClaw"
            icon="🤖"
            count={getCategoryCount('openclaw')}
            isSelected={selectedCategory === 'openclaw'}
            onClick={() => handleCategoryClick('openclaw')}
          />
        </div>
      </div>

      {/* Clients Section */}
      <div>
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
          Clients
        </h3>
        <div className="space-y-1">
          {clients.length === 0 ? (
            <div className="text-slate-500 text-xs px-3 py-2">No clients yet</div>
          ) : (
            clients.map(client => (
              <CategoryButton
                key={client.id}
                id={`client:${client.id}`}
                label={client.name}
                icon="👔"
                count={getCategoryCount('client', client.id)}
                isSelected={selectedCategory === `client:${client.id}`}
                onClick={() => handleCategoryClick(`client:${client.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
