import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cyra Kanban',
  description: 'Task tracker for Cyra and Victor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="text-white">{children}</body>
    </html>
  )
}
