import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Biblia Quiz',
  description: 'Estudio bíblico interactivo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* ✅ CRUCIAL: AuthProvider debe envolver TODA la app */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}