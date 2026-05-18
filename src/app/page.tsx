'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
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
  const [loading, setLoading] = useState(true)
  const [progreso, setProgreso] = useState({ completadas: 0, porcentaje: 0 })

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      cargarTodo()
    }
  }, [user])

  const cargarTodo = async () => {
    try {
      const { data: temasData } = await supabase
        .from('temas')
        .select('id, nombre, descripcion')
        .eq('activo', true)
        .order('orden', { ascending: true })
      setTemas(temasData || [])

      if (user) {
        const { data: prog } = await supabase
          .from('user_progress')
          .select('completado')
          .eq('user_id', user.id)
          .eq('completado', true)
        
        const { count: total } = await supabase
          .from('secciones')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true)
        
        const completadas = prog?.length || 0
        const totalSecciones = total || 1
        setProgreso({
          completadas,
          porcentaje: Math.round((completadas / totalSecciones) * 100)
        })
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F46E5] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        
        {/* Header con usuario y logout */}
        <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-md py-4 mb-8 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A]">📖 Biblia Quiz</h1>
            <p className="text-sm md:text-base text-[#64748B]">Aprende, practica y crece en la fe</p>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 md:mb-12 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-4 md:p-6 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl md:text-3xl mb-1">📚</div>
            <div className="text-xl md:text-2xl font-bold text-[#0F172A]">{temas.length}</div>
            <div className="text-xs md:text-sm text-[#94A3B8]">Temas</div>
          </div>
          <div className="bg-white rounded-2xl p-4 md:p-6 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl md:text-3xl mb-1">🎯</div>
            <div className="text-xl md:text-2xl font-bold text-[#0F172A]">{progreso.porcentaje}%</div>
            <div className="text-xs md:text-sm text-[#94A3B8]">Progreso</div>
          </div>
          <div className="bg-white rounded-2xl p-4 md:p-6 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl md:text-3xl mb-1">✅</div>
            <div className="text-xl md:text-2xl font-bold text-[#0F172A]">{progreso.completadas}</div>
            <div className="text-xs md:text-sm text-[#94A3B8]">Completadas</div>
          </div>
        </div>

        {/* Grid de Temas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {temas.map((tema) => (
            <Link key={tema.id} href={`/tema/${tema.id}`} className="block">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] hover:border-[#4F46E5] hover:shadow-md transition cursor-pointer h-full flex flex-col">
                <h2 className="text-xl font-bold text-[#0F172A] mb-2">{tema.nombre}</h2>
                <p className="text-sm text-[#64748B] flex-grow">{tema.descripcion}</p>
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] text-xs text-[#4F46E5] font-medium text-right">
                  Ir a secciones →
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-[#94A3B8]">
          v1.0 Web • Sincronizado con Supabase
        </div>
      </div>
    </div>
  )
}