import { NextRequest, NextResponse } from 'next/server'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'
const API_KEY = process.env.GEMINI_API_KEY as string

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json()

        const systemPrompt = `You are Jeevan, a helpful and compassionate AI assistant for an organ donation platform called "Jeevan Setu" (Bridge of Life). 

Your role is to:
1. Provide accurate information about organ donation
2. Address concerns and myths about organ donation
3. Guide users through the donation process
4. Provide emotional support for families considering donation
5. Share success stories and positive impact of organ donation
6. Answer questions about medical procedures, eligibility, and legal aspects
7. Connect users with appropriate resources and support

Guidelines:
- Be warm, empathetic, and respectful
- Use simple, clear language
- Provide accurate medical information
- Be sensitive to cultural and religious concerns
- Encourage but never pressure anyone
- If asked about specific medical advice, always recommend consulting healthcare professionals
- Keep responses concise but informative
- Use emojis occasionally to make conversations friendly

Current user question: "${message}"

Please respond as Jeevan would, focusing specifically on organ donation topics.`

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({ response: data.candidates[0].content.parts[0].text })
    } else {
      throw new Error('Unexpected response format')
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to get response from Gemini' },
      { status: 500 }
    )
  }
}