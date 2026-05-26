import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

const PUBLIC_ROUTES = ['/login', '/register', '/reset-password', '/api/auth']
const ADMIN_ROUTES = ['/admin']
const HR_ROUTES = ['/campaigns/new', '/reporting']

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  if (isPublicRoute) return NextResponse.next()

  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  const role = session.user.role

  if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (HR_ROUTES.some(r => pathname.includes(r)) && !['RH', 'ADMIN'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
