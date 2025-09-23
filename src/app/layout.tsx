import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from '@/contexts/AuthContext'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Precatórios Chatbot - Sistema de Gestão",
  description: "Sistema completo para gestão de leads e atendimento via WhatsApp para precatórios",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}