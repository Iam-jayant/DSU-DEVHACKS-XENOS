import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { LanguageProvider } from '@/contexts/language-context'
import { ChatbotWrapper } from "@/components/chatbot/ChatbotWrapper"

export const metadata: Metadata = {
  title: 'Jeevan Setu',
  description:
    'A centralised platform for donors and recipients for organ donation. Created by Jayant Kurekar and Team Xenos',
}

import { setupAutoMatching } from '@/lib/matching-system'

// Set up automatic matching system
if (process.env.NODE_ENV === 'production') {
  setupAutoMatching().catch(console.error)
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LanguageProvider>
            {children}
            <ChatbotWrapper />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
