import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SDC Manager - Son Du Ciel Events',
  description: 'Gestion de l\'événement Le Spécial 51 Jours Chrono du Mondial 2026',
  manifest: '/manifest.json',
  themeColor: '#F97316',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
