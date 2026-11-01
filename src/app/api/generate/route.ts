import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: Request) {
  try {
    const { examId, imageUrl, count = 3 } = await req.json()

    // 1. Fetch file/image data from Supabase storage
    const imageResp = await fetch(imageUrl)
    const arrayBuffer = await imageResp.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = imageResp.headers.get('content-type') || 'image/png'

    // 2. Request structured questions from Gemini using the dynamic count
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
        {
          text: `Analyze this exam document image. Extract the concepts and generate exactly ${count} multiple-choice practice questions based on it. 
          Respond ONLY with a valid JSON array formatted like this:
          [
            {
              "question_type": "multiple-choice",
              "question_text": "Sample question?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_answer": "Option A",
              "explanation": "Why this option is correct."
            }
          ]`,
        },
      ],
    })

    const rawText = response.text || '[]'
    const cleanJson = rawText.replace(/```json|```/g, '').trim()
    const questions = JSON.parse(cleanJson)

    return NextResponse.json({ success: true, questions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}