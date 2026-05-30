import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Service key non configurée' }, { status: 500 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { user_id, full_name, role, phone, password } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'user_id manquant' }, { status: 400 })

    await admin.from('user_profiles').update({ full_name, role, phone: phone || null }).eq('id', user_id)
    if (password) await admin.auth.admin.updateUserById(user_id, { password })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
