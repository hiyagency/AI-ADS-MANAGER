import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const configurationIssues = [
  ...(!supabaseUrl ? ['VITE_SUPABASE_URL is missing.'] : []),
  ...(supabaseUrl && !isHttpUrl(supabaseUrl) ? ['VITE_SUPABASE_URL is invalid.'] : []),
  ...(!supabasePublishableKey ? ['VITE_SUPABASE_PUBLISHABLE_KEY is missing.'] : []),
]

export const supabaseConfiguration = Object.freeze({
  configured: configurationIssues.length === 0,
  issues: configurationIssues as readonly string[],
})

export const supabase: SupabaseClient<Database> | null = supabaseConfiguration.configured
  ? createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
      },
    })
  : null
