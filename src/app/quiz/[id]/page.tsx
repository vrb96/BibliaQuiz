'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import confetti from 'canvas-confetti'
import { playSound } from '@/utils/soundManager'

interface Pregunta {
  id: number
  pregunta: string
  opciones: string[]
  correcta: number
  explicacion: string
}

// ✅ Interfaz para stats de gamificación
interface UserStats {
  xp: number
  level: number
  streak: number
  badges: string[]
  last_played?: string
}

const TIEMPO_POR_PREGUNTA = 15

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const seccionId = Number(params.id)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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
  
  // ✅ Estado para pantalla de resultados
  const [mostrarResultados, setMostrarResultados] = useState(false)

  useEffect(() => {
    cargarQuiz()
  }, [])

  const cargarQuiz = async () => {
    if (!user) return

    const { data: seccionData } = await supabase
      .from('secciones')
      .select('tema_id, nombre')
      .eq('id', seccionId)
      .single()

    if (seccionData) {
      setTemaId(seccionData.tema_id)
      setSeccionNombre(seccionData.nombre)
    }

    const { data: preguntasData } = await supabase
      .from('preguntas')
      .select('*')
      .eq('seccion_id', seccionId)
      .eq('activo', true)

    if (preguntasData) {
      setPreguntas([...preguntasData].sort(() => Math.random() - 0.5))
    }
    setLoading(false)
  }

  // ✅ CORRECCIÓN: Se agregó !mostrarResultados para detener el timer al terminar
  useEffect(() => {
    if (!loading && preguntas.length > 0 && currentIndex < preguntas.length && !mostrarResultados) {
      setRespondida(false)
      setSelectedOption(null)
      prepararPregunta()
      iniciarTemporizador()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIndex, preguntas, loading, mostrarResultados])

  const prepararPregunta = () => {
    const pregunta = preguntas[currentIndex]
    const opcionesMezcladas = [...pregunta.opciones].sort(() => Math.random() - 0.5)
    setShuffledOptions(opcionesMezcladas)
    setCorrectIndex(opcionesMezcladas.indexOf(pregunta.opciones[pregunta.correcta]))
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

  const verificarRespuesta = (indiceSeleccionado: number) => {
    if (respondida) return
    if (timerRef.current) clearInterval(timerRef.current)
    setRespondida(true)
    setSelectedOption(indiceSeleccionado)

    const esTimeout = indiceSeleccionado === -1
    const esCorrecta = !esTimeout && indiceSeleccionado === correctIndex

    if (esCorrecta) {
      setAciertos(prev => prev + 1)
      playSound('correct')
    } else {
      playSound('incorrect')
    }
  }

  const avanzarPregunta = () => {
    if (currentIndex < preguntas.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      finalizarQuiz()
    }
  }

  // ✅ Actualizar XP, racha e insignias en Supabase (con logs)
  const actualizarGamificacion = async (esPrimeraVez: boolean, porcentaje: number) => {
    if (!user) {
      console.log("❌ Gamification: No hay usuario logueado")
      return
    }

    console.log("🔄 Gamification: Iniciando guardado...", { aciertos, esPrimeraVez, porcentaje })

    const hoy = new Date().toISOString().split('T')[0]
    const xpGanado = aciertos * 10

    try {
      // 1. Obtener stats actuales
      const { data: stats, error: selectError } = await supabase
        .from('user_stats')
        .select('xp, level, streak, badges, last_played')
        .eq('user_id', user.id)
        .single()

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = Not Found (normal si es primera vez)
        console.error("❌ Gamification Error al leer stats:", selectError)
        return
      }

      // 2. Lógica de racha
      let nuevaRacha = 1
      if (stats?.last_played) {
        const ultimo = new Date(stats.last_played)
        const diffDias = Math.floor((new Date(hoy).getTime() - ultimo.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDias === 0) nuevaRacha = stats.streak
        else if (diffDias === 1) nuevaRacha = stats.streak + 1
      }

      // 3. Insignias
      const nuevasInsignias: string[] = []
      if (esPrimeraVez) nuevasInsignias.push('Primer Quiz')
      if (nuevaRacha >= 7) nuevasInsignias.push('🔥 Racha 7 días')
      if (porcentaje === 100) nuevasInsignias.push('💯 Perfección')

      const badgesActuales = Array.isArray(stats?.badges) ? stats.badges : []
      const xpActual = stats?.xp ?? 0

      // 4. Guardar en Supabase
      const { error: upsertError } = await supabase.from('user_stats').upsert({
        user_id: user.id,
        xp: xpActual + xpGanado,
        level: Math.floor((xpActual + xpGanado) / 100) + 1,
        streak: nuevaRacha,
        last_played: hoy,
        badges: [...new Set([...badgesActuales, ...nuevasInsignias])],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

      if (upsertError) {
        console.error("❌ Gamification Error al guardar:", upsertError)
      } else {
        console.log("✅ Gamification: Guardado exitoso. XP:", xpActual + xpGanado)
      }

    } catch (err) {
      console.error("❌ Gamification Excepción inesperada:", err)
    }
  }

  // ✅ NUEVA LÓGICA: Guarda, muestra resultados y NO redirige automáticamente
  const finalizarQuiz = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    const total = preguntas.length
    const porcentaje = Math.round((aciertos / total) * 100)
    const aprobado = porcentaje >= 70

    if (user) {
      // Guardar progreso del tema
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        tema_id: temaId,
        seccion_id: seccionId,
        aciertos,
        total,
        completado: aprobado,
        precision: porcentaje,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,seccion_id' })

      // Actualizar gamificación
      await actualizarGamificacion(!aprobado, porcentaje)
    }

    if (aprobado) {
      playSound('success')
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#EF4444', '#F59E0B']
      })
    }

    // ✅ Muestra pantalla de resultados en lugar de redirigir
    setMostrarResultados(true)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Cargando preguntas...</p>
        </div>
      </div>
    )
  }

  if (preguntas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border text-center max-w-md">
          <p className="text-3xl mb-3">📭</p>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">Sin preguntas</h2>
          <p className="text-[#64748B] mb-4">No hay preguntas disponibles para esta sección.</p>
          <button onClick={() => router.push(`/tema/${temaId}`)} className="bg-[#4F46E5] text-white px-6 py-2 rounded-xl font-medium hover:bg-[#4338CA] transition">Volver</button>
        </div>
      </div>
    )
  }

  // ✅ PANTALLA DE RESULTADOS (Reemplaza la redirección automática)
  if (mostrarResultados) {
    const total = preguntas.length
    const porcentaje = Math.round((aciertos / total) * 100)
    const aprobado = porcentaje >= 70

    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border max-w-md w-full text-center">
          <div className="text-5xl mb-4">{aprobado ? '' : '📖'}</div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
            {aprobado ? '¡Sección Completada!' : '¡Sigue Practicando!'}
          </h2>
          <p className="text-[#64748B] mb-6">
            {aprobado
              ? 'Has aprobado con éxito. ¡Excelente trabajo!'
              : 'Necesitas 70% para aprobar. ¡Inténtalo de nuevo!'}
          </p>

          <div className="bg-[#F8FAFC] rounded-xl p-4 mb-6 border border-[#E2E8F0]">
            <div className="text-3xl font-bold text-[#4F46E5] mb-1">{porcentaje}%</div>
            <div className="text-sm text-[#64748B]">{aciertos} de {total} correctas</div>
          </div>

          <button
            onClick={() => router.push(`/tema/${temaId}`)}
            className="w-full bg-[#4F46E5] text-white py-3 rounded-xl font-bold hover:bg-[#4338CA] transition shadow-md active:scale-[0.98]"
          >
            Volver a Secciones
          </button>
        </div>
      </div>
    )
  }

  if (currentIndex >= preguntas.length) return null

  const preguntaActual = preguntas[currentIndex]
  const progresoQuiz = (currentIndex / preguntas.length) * 100

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-8 lg:px-16 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow-sm border border-[#E2E8F0] hover:bg-gray-50 transition">⬅️</button>
          <div className="text-right">
            <p className="text-sm font-medium text-[#0F172A] truncate max-w-[200px] md:max-w-xs">{seccionNombre}</p>
            <p className="text-xs text-[#64748B]">{currentIndex + 1} / {preguntas.length} • ✅ {aciertos}</p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-sm font-bold transition-colors ${tiempoRestante <= 3 ? 'text-[#EF4444]' : 'text-[#4F46E5]'}`}>⏱️ {tiempoRestante}s</span>
          <div className="flex-1 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${tiempoRestante <= 3 ? 'bg-[#EF4444]' : 'bg-[#4F46E5]'}`} style={{ width: `${(tiempoRestante / TIEMPO_POR_PREGUNTA) * 100}%` }} />
          </div>
        </div>

        {/* Quiz Progress Bar */}
        <div className="w-full bg-[#E2E8F0] rounded-full h-2 mb-8 overflow-hidden">
          <div className="bg-[#4F46E5] h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${progresoQuiz}%` }} />
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2E8F0] mb-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-[#0F172A] leading-relaxed">{preguntaActual.pregunta}</h2>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {shuffledOptions.map((opcion, indice) => {
            let clasesBorde = "border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#4F46E5]"
            if (respondida) {
              if (indice === correctIndex) clasesBorde = "border-[#10B981] bg-white text-[#10B981] shadow-[0_0_0_1px_#10B981]"
              else if (indice === selectedOption) clasesBorde = "border-[#EF4444] bg-white text-[#EF4444] shadow-[0_0_0_1px_#EF4444]"
              else clasesBorde = "border-[#E2E8F0] bg-white text-[#94A3B8] opacity-50"
            }
            return (
              <button key={indice} onClick={() => verificarRespuesta(indice)} disabled={respondida} className={`p-4 md:p-5 rounded-xl border-2 text-left font-medium transition-all active:scale-[0.98] ${clasesBorde}`}>
                {opcion}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {respondida && preguntaActual.explicacion && (
          <div className={`p-4 rounded-xl border mb-6 text-center ${selectedOption === correctIndex ? 'bg-[#F0FDF4] border-[#10B981] text-[#059669]' : selectedOption === -1 ? 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]' : 'bg-[#FEF2F2] border-[#EF4444] text-[#B91C1C]'}`}>
            <p className="font-bold mb-1">{selectedOption === correctIndex ? '✅ ¡Correcto!' : selectedOption === -1 ? '⏱️ Tiempo agotado' : '❌ Incorrecto'}</p>
            <p className="text-sm">{preguntaActual.explicacion}</p>
          </div>
        )}

        {/* Next Button */}
        {respondida && (
          <button onClick={avanzarPregunta} className="w-full max-w-md mx-auto bg-[#4F46E5] text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:bg-[#4338CA] active:scale-[0.98] transition-all">
            {currentIndex === preguntas.length - 1 ? 'Ver Resultados 🏁' : 'Siguiente ➡️'}
          </button>
        )}
      </div>
    </div>
  )
}