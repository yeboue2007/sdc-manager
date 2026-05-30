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

    const { email, password, full_name, role, phone } = await req.json()
    if (!email || !password || !full_name || !role)
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })

    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, role }
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await admin.from('user_profiles').upsert({
      id: data.user.id, full_name, role, phone: phone || null, active: true
    })

    return NextResponse.json({ success: true, id: data.user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
