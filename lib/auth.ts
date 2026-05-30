import { supabase } from './supabase'

export type UserRole = 'admin' | 'comptable' | 'responsable_stock' | 'responsable_stands' | 'rh' | 'superviseur' | 'billetterie'

// Pages accessibles par rôle
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

export async function getCurrentUserRole(): Promise<{ role: UserRole | null; userId: string | null; fullName: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: null, userId: null, fullName: null }

  const { data } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  return {
    role: (data?.role as UserRole) || null,
    userId: user.id,
    fullName: data?.full_name || null
  }
}

export function canAccess(role: UserRole | null, page: string): boolean {
  if (!role) return false
  return ROLE_ACCESS[role]?.includes(page) ?? false
}
