import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// ✅ Crear cliente solo si hay URL (si no, objeto vacío que no crashea)
export const supabase = supabaseUrl 
  ? createClient(supabaseUrl, supabaseKey)
  : {
      auth: {
        getSession: async () => ({ session: null, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
        signInWithPassword: async () => ({ data: null, error: null }),
        signUp: async () => ({ data: null, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => ({ data: [], error: null }) }) }),
        upsert: async () => ({ data: null, error: null }),
      }),
    } as any