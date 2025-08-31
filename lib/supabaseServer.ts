import { createClient } from '@supabase/supabase-js'

// Lazy initialization - only create client when needed (at runtime)
let supabaseServerClient: any = null

export function getSupabaseServer() {
  if (!supabaseServerClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    supabaseServerClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  
  return supabaseServerClient
}

export interface User {
  id: string
  phone_number: string
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  problem_id?: string
  language: 'cpp' | 'python'
  code: string
  created_at: string
  updated_at: string
}

export interface Keystroke {
  id: string
  session_id: string
  timestamp: string
  key: string
  action: 'keydown' | 'keyup' | 'input'
  cursor_position: number
  code_snapshot: string
  created_at: string
}

export interface CodeExecution {
  id: string
  session_id: string
  code: string
  language: 'cpp' | 'python'
  output: string
  error?: string
  execution_time: number
  created_at: string
}
