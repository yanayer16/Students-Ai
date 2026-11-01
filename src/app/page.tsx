'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Upload, Sparkles, ArrowRight, Loader2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [questionCount, setQuestionCount] = useState('3') // Default to 3 questions
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const handleUploadAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !file) {
      setStatusMessage('Please provide both an exam title and a file.')
      return
    }

    try {
      setLoading(true)
      setStatusMessage('Uploading file to secure storage...')

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('exam-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('exam-files')
        .getPublicUrl(fileName)

      setStatusMessage('Creating exam session...')

      const { data: examData, error: dbError } = await supabase
        .from('exams')
        .insert([
          {
            title: title,
            file_url: publicUrlData.publicUrl,
            raw_text: 'Extracted from uploaded document.',
          },
        ])
        .select()
        .single()

      if (dbError) throw dbError

      setStatusMessage(`AI is crafting your ${questionCount} practice questions...`)

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: examData.id,
          imageUrl: publicUrlData.publicUrl,
          count: parseInt(questionCount), // Sends selected number to backend
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions')

      const questionsToInsert = data.questions.map((q: any) => ({
        exam_id: examData.id,
        question_type: q.question_type || 'multiple-choice',
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      }))

      const { error: qError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (qError) throw qError

      setStatusMessage('Ready! Redirecting to quiz...')
      router.push(`/exam/${examData.id}`)
    } catch (error: any) {
      setStatusMessage(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-indigo-500 bg-clip-text text-transparent">
          AI Exam Practice Generator
        </h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          Upload your study notes or exam paper to generate a custom interactive practice session.
        </p>

        <form onSubmit={handleUploadAndSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Exam Title / Subject
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Physics Mechanics Midterm"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Number of Questions (2 to 6)
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="2">2 Questions</option>
              <option value="3">3 Questions</option>
              <option value="4">4 Questions</option>
              <option value="5">5 Questions</option>
              <option value="6">6 Questions</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Upload Source Document (Image or PDF)
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/40 rounded-2xl p-6 cursor-pointer transition-all group">
              <div className="p-3 bg-slate-900 rounded-xl text-slate-400 group-hover:text-blue-400 transition-all mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-slate-200">
                {file ? file.name : 'Click to browse or drop file here'}
              </span>
              <span className="text-xs text-slate-500 mt-1">Supports PNG, JPG, PDF</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                required
              />
            </label>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Generate Interactive Quiz</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </form>

        {statusMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl text-center text-sm text-blue-400 font-medium"
          >
            {statusMessage}
          </motion.div>
        )}
      </motion.div>
    </main>
  )
}