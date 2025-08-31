import { createClient } from '@supabase/supabase-js'

// Debug environment variables
console.log('🔍 Environment Debug:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length)
console.log('All env vars starting with NEXT_PUBLIC:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

console.log('🔍 Final values:')
console.log('supabaseUrl:', supabaseUrl)
console.log('supabaseAnonKey length:', supabaseAnonKey.length)

// Create client with placeholder values for build time
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseAnonKey !== 'placeholder-key' &&
         supabaseUrl.length > 0 &&
         supabaseAnonKey.length > 0
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
