'use client'

import { ClientInfo } from '@/data/clients'
import { Task } from '@/types/kanban'

const statusBadges: Record<string, string> = {
  active: 'text-green-400/90 bg-green-500/10 border-green-400/40',
  paused: 'text-yellow-300/90 bg-yellow-500/10 border-yellow-300/40',
  completed: 'text-slate-300/90 bg-slate-600/20 border-slate-500/40',
}

export default function ClientPanel({ clients, tasks }: { clients: ClientInfo[]; tasks: Task[] }) {
  if (clients.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-4">
        <p className="text-xs text-slate-400">No clients yet. Add one in src/data/clients.ts and I will keep it updated.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client Library</p>
          <p className="text-sm font-medium text-white">Projects + context</p>
        </div>
        <span className="text-xs text-slate-500">{clients.length} clients</span>
      </div>

      <div className="max-h-[320px] space-y-3 overflow-y-auto">
        {clients.map(client => {
          const relatedTasks = client.projectKey ? tasks.filter(task => task.project === client.projectKey) : []
          const badgeClass = statusBadges[(client.status || 'active').toLowerCase()] || statusBadges.active
          return (
            <div key={client.id} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.description}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                  {client.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{client.contactName}</span>
                <span>{client.contactEmail}</span>
                {relatedTasks.length > 0 && <span>{relatedTasks.length} task{relatedTasks.length === 1 ? '' : 's'}</span>}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <a
                  href={client.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  Open Drive folder
                </a>
                <span className="text-slate-500">ID: {client.driveFolderId}</span>
              </div>

              {client.goals.length > 0 && (
                <p className="text-xs text-slate-400">
                  <span className="text-slate-300">Goals:</span> {client.goals.join(' · ')}
                </p>
              )}

              {client.initiatives.length > 0 && (
                <p className="text-xs text-slate-400">
                  <span className="text-slate-300">Initiatives:</span> {client.initiatives.join(' · ')}
                </p>
              )}

              {client.notes && client.notes.length > 0 && (
                <div className="space-y-1">
                  {client.notes.map(note => (
                    <p key={note} className="text-xs text-slate-500">
                      • {note}
                    </p>
                  ))}
                </div>
              )}

              {client.subfolders && client.subfolders.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {client.subfolders.map(folder => (
                    <a
                      key={folder.url}
                      href={folder.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-cyan-500 hover:text-cyan-400"
                    >
                      {folder.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
