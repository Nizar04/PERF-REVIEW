import type { UserRole } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: UserRole
    organizationId: string
    firstName: string
    lastName: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      role: UserRole
      organizationId: string
      firstName: string
      lastName: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    organizationId: string
    firstName: string
    lastName: string
  }
}
