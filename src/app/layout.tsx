import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cyra Command Center',
  description: 'AI Operations Dashboard for Victor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
