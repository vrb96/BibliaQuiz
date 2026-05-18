import { createClient } from '@supabase/supabase-js'

// ✅ Leer variables de entorno (funciona en Next.js + Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 🔒 Validación en desarrollo (opcional, para detectar errores temprano)
if (!supabaseUrl || !supabaseKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
  }
}

// ✅ Crear y exportar el cliente (named export)
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseKey || ''
)