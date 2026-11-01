'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Award } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function QuizContent() {
  const params = useParams()
  const examId = params.id

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({})
  const [checkedAnswers, setCheckedAnswers] = useState<{ [key: number]: boolean }>({})
  const [score, setScore] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    async function fetchQuizData() {
      if (!examId) return

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      const { data: qData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)

      setExam(examData)
      setQuestions(qData || [])
      setLoading(false)
    }

    fetchQuizData()
  }, [examId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading your exam session...</p>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">No questions found for this exam.</h2>
          <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">
            Back to Upload
          </Link>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  const selectedOption = selectedAnswers[currentIndex]
  const isChecked = checkedAnswers[currentIndex]

  const handleSelectOption = (option: string) => {
    if (isChecked) return
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: option })
  }

  const handleCheckAnswer = () => {
    if (!selectedOption) return
    setCheckedAnswers({ ...checkedAnswers, [currentIndex]: true })
    
    if (selectedOption.trim() === currentQ.correct_answer.trim()) {
      setScore(prev => prev + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setIsCompleted(true)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10">
        {!isCompleted ? (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  {exam?.title || 'Practice Exam'}
                </span>
                <h2 className="text-lg font-bold text-slate-200 mt-0.5">
                  Question {currentIndex + 1} of {questions.length}
                </h2>
              </div>
              <div className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium text-slate-300">
                Score: {score}
              </div>
            </div>

            <div className="text-xl font-semibold text-slate-100 mb-6 leading-relaxed dir-auto">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {currentQ.question_text}
              </ReactMarkdown>
            </div>

            <div className="space-y-3 mb-8">
              {currentQ.options.map((opt: string, optIdx: number) => {
                const isSelected = selectedOption === opt
                const isCorrect = opt.trim() === currentQ.correct_answer.trim()

                let optionStyle = "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                
                if (isChecked) {
                  if (isCorrect) {
                    optionStyle = "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/50"
                  } else if (isSelected && !isCorrect) {
                    optionStyle = "bg-rose-950/40 border-rose-500/50 text-rose-200"
                  }
                } else if (isSelected) {
                  optionStyle = "bg-blue-950/40 border-blue-500 text-blue-200 shadow-lg shadow-blue-950/50"
                }

                return (
                  <motion.button
                    key={optIdx}
                    whileHover={{ scale: isChecked ? 1 : 1.01 }}
                    whileTap={{ scale: isChecked ? 1 : 0.99 }}
                    onClick={() => handleSelectOption(opt)}
                    disabled={isChecked}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${optionStyle} cursor-pointer`}
                  >
                    <span className="text-sm font-medium dir-auto">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {opt}
                      </ReactMarkdown>
                    </span>
                    {isSelected && !isChecked && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    {isChecked && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {isChecked && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                  </motion.button>
                )
              })}
            </div>

            <AnimatePresence>
              {isChecked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`p-4 rounded-2xl mb-6 border ${
                    selectedOption?.trim() === currentQ.correct_answer.trim()
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <p className="font-semibold text-sm mb-1">
                    {selectedOption?.trim() === currentQ.correct_answer.trim()
                      ? '🎉 Correct!'
                      : `❌ Incorrect. The correct answer is: ${currentQ.correct_answer}`}
                  </p>
                  <div className="text-xs text-slate-300 leading-relaxed mt-1 dir-auto">
                    <span className="font-semibold">Explanation: </span>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {currentQ.explanation}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-3">
              {!isChecked ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckAnswer}
                  disabled={!selectedOption}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-40 cursor-pointer"
                >
                  Check Answer
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextQuestion}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                <Award className="w-12 h-12" />
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-slate-100">Quiz Completed!</h2>
              <p className="text-slate-400 text-sm mt-1">Here is how you performed on {exam?.title}</p>
            </div>

            <div className="py-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 max-w-xs mx-auto">
              <span className="text-5xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                {score} / {questions.length}
              </span>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-2">Final Score</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  setSelectedAnswers({})
                  setCheckedAnswers({})
                  setScore(0)
                  setIsCompleted(false)
                }}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <Link
                href="/"
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Upload New Exam</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  )
}

export default function ExamQuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <QuizContent />
    </Suspense>
  )
}