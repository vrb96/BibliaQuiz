'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Seccion {
  id: number
  nombre: string
  descripcion: string
  orden: number
}

interface Progreso {
  seccion_id: number
  aciertos: number
  total: number
  completado: boolean
}

export default function SeccionesPage() {
  const params = useParams()
  const router = useRouter()
  const temaId = Number(params.id)

  const { user, loading: authLoading } = useAuth()
  
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [temaNombre, setTemaNombre] = useState('Cargando...')
  const [loadingData, setLoadingData] = useState(true)
  const [progresoUsuario, setProgresoUsuario] = useState<Progreso[]>([])

  // 🔐 Redirigir si no hay sesión
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  // 📥 Cargar datos cuando haya usuario
  useEffect(() => {
    if (user) cargarTodo()
  }, [user, temaId])

  const cargarTodo = async () => {
    if (!user) return
    const userId = user.id

    try {
      setLoadingData(true)

      // 1. Nombre del tema
      const { data: temaData } = await supabase
        .from('temas')
        .select('nombre')
        .eq('id', temaId)
        .single()
      if (temaData) setTemaNombre(temaData.nombre)

      // 2. Secciones
      const { data: seccionesData } = await supabase
        .from('secciones')
        .select('*')
        .eq('tema_id', temaId)
        .eq('activo', true)
        .order('orden', { ascending: true })
      if (seccionesData) setSecciones(seccionesData)

      // 3. Progreso del usuario
      const { data: progreso } = await supabase
        .from('user_progress')
        .select('seccion_id, aciertos, total, completado')
        .eq('user_id', userId)
        .eq('tema_id', temaId)
      if (progreso) setProgresoUsuario(progreso)

    } catch (error) {
      console.error("Error cargando tema:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const estaBloqueada = (index: number) => {
    if (index === 0) return false
    const ant = secciones[index - 1]
    if (!ant) return true
    const progresoAnt = progresoUsuario.find(p => p.seccion_id === ant.id)
    return !progresoAnt || !progresoAnt.completado
  }

  const obtenerProgreso = (seccionId: number) => {
    const p = progresoUsuario.find(x => x.seccion_id === seccionId)
    if (!p) return { pct: 0, completado: false, aciertos: 0, total: 0 }
    const pct = p.total > 0 ? Math.round((p.aciertos / p.total) * 100) : 0
    return { pct, completado: p.completado, aciertos: p.aciertos, total: p.total }
  }

  const obtenerEmoji = (n: string) => n.includes('General') ? '📋' : n.includes('Palabra') ? '📖' : n.includes('Eucarist') ? '🍞' : n.includes('Conclusión') ? '🙏' : '📚'

  if (authLoading || !user || loadingData) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando secciones...</div>
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        
        {/* 🔹 Header con Usuario y Salir */}
        <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-md py-4 mb-6 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-gray-50 border border-gray-200 transition text-xl">
              ⬅️
            </Link>
            <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] truncate max-w-[200px] md:max-w-md">{temaNombre}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm text-[#64748B] bg-white px-3 py-1 rounded-full border border-gray-200">
              👤 {user?.email}
            </span>
            <button 
              onClick={async () => {
                await supabase.auth.signOut()
                router.replace('/login')
              }}
              className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-medium rounded-full transition shadow-sm"
            >
              Salir
            </button>
          </div>
        </div>

        {/* 🔹 Grid de Secciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-10">
          {secciones.map((sec, index) => {
            const bloqueada = estaBloqueada(index)
            const { pct, completado, aciertos, total } = obtenerProgreso(sec.id)

            return (
              <Link 
                key={sec.id} 
                href={bloqueada ? '#' : `/quiz/${sec.id}`}
                onClick={e => {
                  if (bloqueada) {
                    e.preventDefault()
                    alert('⚠️ Completa la sección anterior primero')
                  }
                }}
                className="block"
              >
                <div className={`rounded-2xl p-5 md:p-6 border-2 transition-all h-full flex flex-col ${
                  bloqueada 
                    ? 'bg-[#F1F5F9] border-[#E2E8F0] opacity-60 cursor-not-allowed' 
                    : 'bg-white border-[#E2E8F0] shadow-sm hover:border-[#4F46E5] hover:shadow-md cursor-pointer'
                }`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`text-2xl w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0 ${bloqueada ? 'bg-gray-300' : 'bg-[#4F46E5]'} text-white`}>
                      {obtenerEmoji(sec.nombre)}
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg leading-tight ${bloqueada ? 'text-gray-500' : 'text-[#0F172A]'}`}>{sec.nombre}</h3>
                      <p className={`text-sm mt-1 ${bloqueada ? 'text-gray-400' : 'text-[#64748B]'}`}>
                        {bloqueada ? '🔒 Completa la anterior' : sec.descripcion || 'Toca para comenzar'}
                      </p>
                    </div>
                  </div>

                  {!bloqueada && (
                    <div className="mt-auto pt-2">
                      <div className="w-full bg-[#E2E8F0] rounded-full h-2.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${completado ? 'bg-[#10B981]' : 'bg-[#4F46E5]'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between mt-2 text-xs">
                        <span className={completado ? 'text-[#10B981] font-medium' : 'text-[#94A3B8]'}>
                          {completado ? '✅ Completado' : `${pct}%`}
                        </span>
                        {pct > 0 && !completado && <span className="text-[#4F46E5]">{aciertos}/{total}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}