import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/api/auth']
const ADMIN_ROUTES = ['/admin']
const HR_ROUTES = ['/campaigns/new', '/reporting']

export default auth(async function middleware(req) {
  const { auth: session, nextUrl } = req as NextRequest & { auth: { user?: { role: string } } | null }
  const isPublicRoute = PUBLIC_ROUTES.some(r => nextUrl.pathname.startsWith(r))

  if (isPublicRoute) return NextResponse.next()

  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Role-based access
  const role = session.user.role

  if (ADMIN_ROUTES.some(r => nextUrl.pathname.startsWith(r)) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  if (HR_ROUTES.some(r => nextUrl.pathname.includes(r)) && !['RH', 'ADMIN'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
