import { NextResponse, type NextRequest } from 'next/server'

// Middleware minimal - la protection est gérée côté client
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
