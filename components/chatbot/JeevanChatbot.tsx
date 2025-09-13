"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Message {
  content: string
  type: 'bot' | 'user'
}

export function JeevanChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      content: "Hello! I'm Jeevan 👋\n\nI'm here to help you with any questions about organ donation. Feel free to ask me anything!",
      type: 'bot'
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages(prev => [...prev, { content: userMessage, type: 'user' }])
    setIsTyping(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { content: data.response, type: 'bot' }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        type: 'bot'
      }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
    <Button
      onClick={() => setIsOpen(!isOpen)}
      className="h-14 w-14 rounded-full bg-gradient-to-br from-green-400 to-cyan-400 hover:from-green-500 hover:to-cyan-500 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-white transition-transform duration-200 ease-in-out group-hover:scale-110"
      >
        <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z"/>
      </svg>
    </Button>

      {isOpen && (
        <Card className="absolute bottom-20 right-0 w-[380px] h-[500px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="bg-gradient-to-r from-green-400 to-cyan-400 p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                J
              </div>
              <div>
                <div className="font-semibold text-white">Jeevan</div>
                <div className="text-xs text-white/90">Online • Ready to help</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-white/80"
            >
              ×
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "mb-4 max-w-[80%]",
                  msg.type === 'user' ? "ml-auto" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2",
                    msg.type === 'user' 
                      ? "bg-gradient-to-r from-green-400 to-cyan-400 text-white rounded-br-sm"
                      : "bg-white text-gray-700 rounded-bl-sm shadow-sm"
                  )}
                >
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="mb-4 max-w-[80%]">
                <div className="bg-white rounded-2xl px-4 py-2 rounded-bl-sm shadow-sm inline-flex space-x-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex space-x-2"
            >
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me about organ donation..."
                className="flex-1"
              />
              <Button 
                type="submit"
                size="icon"
                className="bg-gradient-to-r from-green-400 to-cyan-400 hover:from-green-500 hover:to-cyan-500"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-white rotate 90"
                >
                  <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                </svg>
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  )
}