import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create client with placeholder values for build time
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseAnonKey !== 'placeholder-key'
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
  timestamp: string // ISO string format from database
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
