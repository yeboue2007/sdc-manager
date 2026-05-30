import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'admin' | 'comptable' | 'responsable_stock' | 'responsable_stands' | 'rh' | 'superviseur' | 'billetterie'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  comptable: 'Comptable',
  responsable_stock: 'Resp. Stock',
  responsable_stands: 'Resp. Stands',
  rh: 'RH / Personnel',
  superviseur: 'Superviseur Terrain',
  billetterie: 'Billetterie',
}
// auto-confirm enabled Sat May 30 16:46:12 UTC 2026
// updated 1780160485
