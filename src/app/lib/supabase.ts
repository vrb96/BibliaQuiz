import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ✅ Función segura que nunca crashea durante el build
export const getSupabase = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Si no hay variables (build/server), retornar mock seguro
  if (!url || !key) {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
          error: null,
        }),
        signInWithPassword: async () => ({ data: null, error: null }),
        signUp: async () => ({ data: null, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => ({  data: [], error: null }) }) }),
        upsert: async () => ({  data: null, error: null }),
      }),
    } as unknown as SupabaseClient
  }

  // En navegador con variables: cliente real
  return createClient(url, key)
}