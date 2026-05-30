import { supabase } from './supabase'

export type UserRole = 'admin' | 'comptable' | 'responsable_stock' | 'responsable_stands' | 'rh' | 'superviseur' | 'billetterie'

export const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin:              ['dashboard','caisses','stock','stands','personnel','depenses','billetterie','rapports','settings','alertes'],
  comptable:          ['dashboard','caisses','depenses','rapports','alertes'],
  responsable_stock:  ['dashboard','stock','alertes'],
  responsable_stands: ['dashboard','stands','alertes'],
  rh:                 ['dashboard','personnel','alertes'],
  superviseur:        ['dashboard','alertes'],
  billetterie:        ['dashboard','billetterie','alertes'],
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:              'Administrateur',
  comptable:          'Comptable',
  responsable_stock:  'Resp. Stock',
  responsable_stands: 'Resp. Stands',
  rh:                 'RH / Personnel',
  superviseur:        'Superviseur Terrain',
  billetterie:        'Billetterie',
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone: string | null
  active: boolean
}

// Charge le profil complet depuis user_profiles — source de vérité unique
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, phone, active')
    .eq('id', user.id)
    .single()

  if (error || !data) return null

  return {
    id: user.id,
    email: user.email || '',
    full_name: data.full_name,
    role: data.role as UserRole,
    phone: data.phone,
    active: data.active,
  }
}

export function canAccess(role: UserRole | null, page: string): boolean {
  if (!role) return false
  return ROLE_ACCESS[role]?.includes(page) ?? false
}
