import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type History = {
  id: string
  user_id: string
  role: string
  company_name: string
  ticker: string
  insight: string
  metrics: any
  dart_summary: string
  created_at: string
}