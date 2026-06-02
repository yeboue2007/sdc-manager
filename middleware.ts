import { type NextRequest, NextResponse } from 'next/server'

// Middleware minimal - la protection est gérée dans le layout côté client
// On protège uniquement les routes API admin
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = { matcher: [] }
