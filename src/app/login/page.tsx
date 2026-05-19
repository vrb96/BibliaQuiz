'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E2E8F0] w-full max-w-md">
        
        {/* 🔹 Logo y Nombre de la App */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20 bg-[#4F46E5] rounded-full flex items-center justify-center text-4xl mb-4 shadow-lg shadow-indigo-200">
            📖
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Biblia Quiz</h1>
          <p className="text-sm text-[#64748B] mt-1">Aprende, practica y crece en la fe</p>
        </div>

        {/* 🔹 Mensaje de Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-50 p-3 rounded-lg border border-red-200">
            {error}
          </p>
        )}

        {/* 🔹 Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">Correo electrónico</label>
            <input 
              type="email" 
              placeholder="tu@email.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              className="w-full p-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-[#0F172A] placeholder:text-gray-400 transition" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              minLength={6}
              className="w-full p-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-[#0F172A] placeholder:text-gray-400 transition" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#4F46E5] text-white py-3 rounded-xl font-bold hover:bg-[#4338CA] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 active:scale-[0.98]"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Entrar' : 'Crear Cuenta')}
          </button>
        </form>

        {/* 🔹 Alternar Login/Registro */}
        <p className="mt-6 text-center text-sm text-[#64748B]">
          {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError('') }} 
            className="text-[#4F46E5] font-medium hover:underline focus:outline-none"
          >
            {isLogin ? 'Regístrate gratis' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}