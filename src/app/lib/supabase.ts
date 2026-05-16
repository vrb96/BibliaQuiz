import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

const createMockSupabaseClient = (): SupabaseClient => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }) as any,
    signInWithPassword: async () => ({ data: null, error: null }),
    signUp: async () => ({ data: null, error: null }),
    signOut: async () => ({ data: null, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({ data: [], error: null, count: 0 }),
        data: [],
        error: null,
        count: 0,
      }),
      data: [],
      error: null,
      count: 0,
    }),
    upsert: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  }),
  rpc: async () => ({ data: null, error: null }),
} as unknown as SupabaseClient)

export const getSupabase = (): SupabaseClient => {
  if (client) return client

  if (typeof window === 'undefined') {
    client = createMockSupabaseClient()
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase vars missing in browser. Auth will not work.')
    client = createMockSupabaseClient()
    return client
  }

  client = createClient(supabaseUrl, supabaseKey)
  return client
}

export default getSupabase