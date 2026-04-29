import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null

export async function dbGet(table, userId) {
  if (!supabase) return null
  const { data } = await supabase.from(table).select('*').eq('id', userId).single()
  return data
}
