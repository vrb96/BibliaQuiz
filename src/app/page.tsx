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

interface UserStats {
  xp: number
  level: number
  streak: number
  badges: string[]
}

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [temas, setTemas] = useState<Tema[]>([])
  const [loading, setLoading] = useState(true)
  const [progreso, setProgreso] = useState({ completadas: 0, porcentaje: 0 })
  const [stats, setStats] = useState<UserStats | null>(null)

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
      // 1. Cargar temas
      const { data: temasData } = await supabase
        .from('temas')
        .select('id, nombre, descripcion')
        .eq('activo', true)
        .order('orden', { ascending: true })
      setTemas(temasData || [])

      if (user) {
        // 2. Cargar progreso
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

        // 3. Cargar stats de gamificación (al mismo nivel, NO anidado)
        const { data: statsData } = await supabase
          .from('user_stats')
          .select('xp, level, streak, badges')
          .eq('user_id', user.id)
          .single()
        
        if (statsData) {
          // ✅ Parseo seguro para badges (jsonb → string[])
          const badgesArray = Array.isArray(statsData.badges) ? statsData.badges : []
          setStats({
            xp: statsData.xp || 0,
            level: statsData.level || 1,
            streak: statsData.streak || 0,
            badges: badgesArray
          })
        }
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

        {/* Stats con Gamificación */}
        <div className="grid grid-cols-3 gap-4 mb-8 md:mb-12 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-xl font-bold text-[#0F172A]">{stats ? stats.streak : 0}</div>
            <div className="text-xs text-[#94A3B8]">Racha</div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-xl font-bold text-[#0F172A]">Nv. {stats ? stats.level : 1}</div>
            <div className="text-xs text-[#94A3B8]">Nivel</div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-[#E2E8F0]">
            <div className="text-2xl mb-1">🏅</div>
            <div className="text-xl font-bold text-[#0F172A]">{stats ? stats.badges.length : 0}</div>
            <div className="text-xs text-[#94A3B8]">Insignias</div>
          </div>
        </div>

        {/* Barra de XP al siguiente nivel */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex justify-between text-xs text-[#64748B] mb-1">
            <span>XP: {stats ? stats.xp : 0}</span>
            <span>Siguiente: {(stats ? stats.level : 1) * 100}</span>
          </div>
          <div className="w-full bg-[#E2E8F0] rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#4F46E5] to-[#10B981] rounded-full transition-all duration-500"
              style={{ width: `${stats ? (stats.xp % 100) : 0}%` }}
            />
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