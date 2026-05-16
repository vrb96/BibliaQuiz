'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import confetti from 'canvas-confetti'

interface Pregunta {
  id: number
  pregunta: string
  opciones: string[]
  correcta: number
  explicacion: string
}

const TIEMPO_POR_PREGUNTA = 15

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const seccionId = Number(params.id)

  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [respondida, setRespondida] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [temaId, setTemaId] = useState(0)
  const [seccionNombre, setSeccionNombre] = useState('')
  const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_POR_PREGUNTA)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [quizFinished, setQuizFinished] = useState(false)
  const [finalScore, setFinalScore] = useState({ aciertos: 0, total: 0, porcentaje: 0, aprobado: false })

  useEffect(() => { cargarQuiz() }, [])

  const cargarQuiz = async () => {
    const {  data : secData } = await getSupabase()
      .from('secciones')
      .select('tema_id, nombre')
      .eq('id', seccionId)
      .single()

    if (secData) {
      setTemaId(secData.tema_id)
      setSeccionNombre(secData.nombre)
    }

    const { data } = await getSupabase()
      .from('preguntas')
      .select('*')
      .eq('seccion_id', seccionId)
      .eq('activo', true)

    if (data) {
      const shuffled = [...data].sort(() => Math.random() - 0.5)
      setPreguntas(shuffled)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!loading && preguntas.length > 0 && currentIndex < preguntas.length) {
      prepararPregunta()
      iniciarTemporizador()
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentIndex, preguntas, loading])

  const prepararPregunta = () => {
    const p = preguntas[currentIndex]
    setRespondida(false)
    setSelectedOption(null)

    const opts = [...p.opciones]
    const shuffledOpts = opts.sort(() => Math.random() - 0.5)
    setShuffledOptions(shuffledOpts)

    const textoCorrecto = p.opciones[p.correcta]
    setCorrectIndex(shuffledOpts.indexOf(textoCorrecto))
  }

  const iniciarTemporizador = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTiempoRestante(TIEMPO_POR_PREGUNTA)
    
    timerRef.current = setInterval(() => {
      setTiempoRestante(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          if (!respondida) verificarRespuesta(-1)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const verificarRespuesta = (index: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    if (respondida) return
    setRespondida(true)
    setSelectedOption(index)

    const esTimeout = index === -1
    const esCorrecta = !esTimeout && index === correctIndex

    if (esCorrecta) setAciertos(prev => prev + 1)
  }

    const siguientePregunta = () => {
    if (currentIndex < preguntas.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      finalizarQuiz() // Solo marca como terminado, NO redirige
    }
  }

  // ✅ FUNCIÓN CLAVE: Guardar progreso en Supabase
    const finalizarQuiz = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const total = preguntas.length
    const porcentaje = Math.round((aciertos / total) * 100)
    const aprobado = porcentaje >= 70

    console.log('🏁 Finalizando quiz...')
    console.log('📊 Tema:', temaId, 'Sección:', seccionId)
    console.log('📈 Aciertos:', aciertos, 'Total:', total, '%:', porcentaje)

    // ☁️ Guardar en Supabase
    if (user) {
      try {
        console.log('🔄 Guardando en cloud...')
        const { error } = await getSupabase()
          .from('user_progress')
          .upsert({
            user_id: user.id,
            tema_id: temaId,
            seccion_id: seccionId,
            aciertos,
            total,
            completado: aprobado,
            precision: porcentaje,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,seccion_id' })

        if (error) console.error('❌ Error:', error)
        else console.log('✅ Progreso guardado en la nube')
      } catch (err) {
        console.error('❌ Excepción:', err)
      }
    }

    // 🎯 Guardar datos finales y mostrar pantalla de resultados
    setFinalScore({ aciertos, total, porcentaje, aprobado })
    setQuizFinished(true)

    //  Confeti si aprobó
    if (aprobado) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#64748B]">Cargando preguntas...</div>
  if (preguntas.length === 0) return <div className="p-8 text-center text-[#64748B]">No hay preguntas disponibles.</div>
  if (currentIndex >= preguntas.length) return null

  const p = preguntas[currentIndex]
  const progreso = (currentIndex / preguntas.length) * 100

    // 📊 PANTALLA DE RESULTADOS (se muestra al terminar)
  if (quizFinished) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#E2E8F0] max-w-md w-full text-center">
          <div className="text-5xl mb-4">{finalScore.aprobado ? '' : '📖'}</div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
            {finalScore.aprobado ? '¡Sección Completada!' : 'Sigue practicando'}
          </h2>
          <p className="text-[#64748B] mb-6">
            {finalScore.aprobado 
              ? 'Has aprobado con éxito. ¡Excelente trabajo!' 
              : 'Necesitas 70% para desbloquear la siguiente sección.'}
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#F8FAFC] p-3 rounded-xl">
              <div className="text-2xl font-bold text-[#4F46E5]">{finalScore.aciertos}/{finalScore.total}</div>
              <div className="text-xs text-[#64748B]">Aciertos</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded-xl">
              <div className="text-2xl font-bold text-[#10B981]">{finalScore.porcentaje}%</div>
              <div className="text-xs text-[#64748B]">Precisión</div>
            </div>
            <div className="bg-[#F8FAFC] p-3 rounded-xl">
              <div className="text-2xl font-bold text-[#F59E0B]">{finalScore.aprobado ? '✅' : '🔄'}</div>
              <div className="text-xs text-[#64748B]">Estado</div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/tema/${temaId}`)}
            className="w-full bg-[#4F46E5] text-white py-3 rounded-xl font-bold hover:bg-[#4338CA] transition active:scale-[0.98]"
          >
            Volver a Secciones
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-8 lg:px-16 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow-sm border border-[#E2E8F0] hover:bg-gray-50 transition">⬅️</button>
          <div className="text-right">
            <p className="text-sm font-medium text-[#0F172A] truncate max-w-[200px] md:max-w-xs">{seccionNombre}</p>
            <div className="flex items-center justify-end gap-3 text-xs text-[#64748B]">
              <span>{currentIndex + 1} / {preguntas.length}</span>
              <span className="text-[#10B981] font-bold">✅ {aciertos}</span>
            </div>
          </div>
        </div>

        {/* Temporizador */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-sm font-bold transition-colors ${tiempoRestante <= 3 ? 'text-[#EF4444]' : 'text-[#4F46E5]'}`}>
            ⏱️ {tiempoRestante}s
          </span>
          <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${tiempoRestante <= 3 ? 'bg-[#EF4444]' : 'bg-[#4F46E5]'}`}
              style={{ width: `${(tiempoRestante / TIEMPO_POR_PREGUNTA) * 100}%` }}
            />
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="w-full bg-[#E2E8F0] rounded-full h-2 mb-8 overflow-hidden">
          <div className="bg-[#4F46E5] h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${progreso}%` }} />
        </div>

        {/* Pregunta */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2E8F0] mb-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-[#0F172A] leading-relaxed">{p.pregunta}</h2>
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {shuffledOptions.map((opt, i) => {
            let borderClass = "border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#4F46E5]"
            if (respondida) {
              const esTimeout = selectedOption === -1
              if (i === correctIndex) {
                borderClass = "border-[#10B981] bg-white text-[#10B981] shadow-[0_0_0_1px_#10B981]"
              } else if (i === selectedOption && !esTimeout) {
                borderClass = "border-[#EF4444] bg-white text-[#EF4444] shadow-[0_0_0_1px_#EF4444]"
              } else {
                borderClass = "border-[#E2E8F0] bg-white text-[#94A3B8] opacity-50"
              }
            }

            return (
              <button
                key={i}
                onClick={() => verificarRespuesta(i)}
                disabled={respondida}
                className={`p-4 md:p-5 rounded-xl border-2 text-left font-medium transition-all active:scale-[0.98] ${borderClass}`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {respondida && (
          <div className={`p-4 rounded-xl border mb-6 text-center ${
            selectedOption === correctIndex 
              ? 'bg-[#F0FDF4] border-[#10B981] text-[#059669]' 
              : selectedOption === -1
                ? 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]'
                : 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]'
          }`}>
            <p className="font-bold mb-1">
              {selectedOption === correctIndex ? '✅ ¡Correcto!' : 
               selectedOption === -1 ? '⏱️ Tiempo agotado.' : '❌ Incorrecto'}
            </p>
            {p.explicacion && <p className="text-sm">{p.explicacion}</p>}
          </div>
        )}

        {/* Botón Siguiente */}
        {respondida && (
          <button
            onClick={siguientePregunta}
            className="w-full max-w-md mx-auto bg-[#4F46E5] text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:bg-[#4338CA] active:scale-[0.98] transition-all"
          >
            {currentIndex === preguntas.length - 1 ? 'Ver Resultados 🏁' : 'Siguiente ➡️'}
          </button>
        )}
      </div>
    </div>
  )
}