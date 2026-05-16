'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from './lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'

interface Tema {
  id: number
  nombre: string
  descripcion: string
}

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [temas, setTemas] = useState<Tema[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ Estado para el progreso global
  const [progresoGlobal, setProgresoGlobal] = useState({
    completadas: 0,
    porcentaje: 0
  })

  // 🔐 Redirigir si no hay sesión
  useEffect(() => {
    const supabase = getSupabase()
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  // 📥 Cargar todo cuando haya usuario
  useEffect(() => {
    if (user) {
      cargarTodo()
    }
  }, [user])

  const cargarTodo = async () => {
    const supabase = getSupabase()
    try {
      setLoadingData(true)
      setError(null)

      const supabase = await getSupabase()

      // 1. Cargar temas
      const { data: temasData, error: temasError } = await supabase
        .from('temas')
        .select('id, nombre, descripcion, orden')
        .eq('activo', true)
        .order('orden', { ascending: true })
      
      if (temasError) throw temasError
      setTemas(temasData || [])

      // ✅ 2. Cargar progreso del usuario (de forma segura)
      if (user) {
        const {  data : progresoData, error: progresoError } = await supabase
          .from('user_progress')
          .select('seccion_id, completado')
          .eq('user_id', user.id)
          .eq('completado', true) // Solo traemos las completadas
        
        if (progresoError) {
          console.error('Error cargando progreso:', progresoError)
        }
        
        // Contar cuántas están completadas
        const completadas = progresoData ? progresoData.length : 0
        
        // 3. Contar total de secciones disponibles
        const {  count : totalSecciones } = await supabase
          .from('secciones')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true)
        
        const total = totalSecciones || 1 // Evitar división por cero
        const porcentaje = Math.round((completadas / total) * 100)
        
        setProgresoGlobal({
          completadas,
          porcentaje
        })
      }

    } catch (err: any) {
      console.error('Error en cargarTodo:', err)
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoadingData(false)
    }
  }

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        
        {/* 🔹 Header */}
        <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-md py-4 mb-8 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A]"> Biblia Quiz</h1>
            <p className="text-sm md:text-base text-[#64748B]">Aprende, practica y crece en la fe</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm text-[#64748B] bg-white px-3 py-1 rounded-full border border-gray-200">
              👤 {user?.email || 'Usuario'}
            </span>
            <button 
              onClick={async () => {
                const supabase = await getSupabase()
                await supabase.auth.signOut()
                router.replace('/login')
              }}
              className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-medium rounded-full transition shadow-sm"
            >
              Salir
            </button>
          </div>
        </div>

        {/* ✅ Stats con progreso REAL */}
        <div className="grid grid-cols-3 gap-4 mb-8 md:mb-12 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-4 md:p-6 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl md:text-3xl mb-1">📚</div>
            <div className="text-xl md:text-2xl font-bold text-[#0F172A]">{temas.length}</div>
            <div className="text-xs md:text-sm text-[#94A3B8]">Temas</div>
          </div>
          <div className="bg-white rounded-2xl p-4 md:p-6 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl md:text-3xl mb-1">🎯</div>
            <div className="text-xl md:text-2xl font-bold text-[#0F172A]">{progresoGlobal.porcentaje}%</div>
            <div className="text-xs md:text-sm text-[#94A3B8]">Progreso</div>
          </div>
          <div className="bg-white rounded-2xl p-4 md:p-6 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl md:text-3xl mb-1">✅</div>
            <div className="text-xl md:text-2xl font-bold text-[#0F172A]">{progresoGlobal.completadas}</div>
            <div className="text-xs md:text-sm text-[#94A3B8]">Completadas</div>
          </div>
        </div>

        {/* Grid de Temas */}
        {loadingData ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5]"></div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <p className="text-red-500 mb-2">Error: {error}</p>
            <button onClick={cargarTodo} className="bg-[#4F46E5] text-white px-6 py-2 rounded-xl font-medium">Reintentar</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {temas.map((tema) => (
              <Link key={tema.id} href={`/tema/${tema.id}`} className="block">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] hover:border-[#4F46E5] transition cursor-pointer h-full flex flex-col">
                  <h2 className="text-xl font-bold text-[#0F172A] mb-2">{tema.nombre}</h2>
                  <p className="text-sm text-gray-500 flex-grow">{tema.descripcion}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-[#4F46E5] font-medium text-right">Ir a secciones →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
        
        <div className="text-center mt-12 text-sm text-[#94A3B8]">v1.0 Web • Sincronizado con Supabase</div>
      </div>
    </div>
  )
}