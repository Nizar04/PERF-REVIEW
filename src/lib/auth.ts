import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations/user'
import type { UserRole } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email, deletedAt: null },
        })

        if (!user || !user.password) return null
        if (!user.isActive) throw new Error('ACCOUNT_DISABLED')

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatarUrl,
          role: user.role,
          organizationId: user.organizationId,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role as UserRole
        token.organizationId = user.organizationId
        token.firstName = user.firstName
        token.lastName = user.lastName
      }

      // Refresh user data if needed
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.organizationId = dbUser.organizationId
          token.firstName = dbUser.firstName
          token.lastName = dbUser.lastName
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.organizationId = token.organizationId as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
      }
      return session
    },
    async signIn({ user, account }) {
      // OAuth: create org & employee if first login
      if (account?.provider !== 'credentials' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (!existingUser) {
          // Auto-create org for first OAuth user (demo flow)
          // In production, require invitation
          return true
        }
      }
      return true
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            resource: 'User',
            resourceId: user.id,
          },
        }).catch(() => null)
      }
    },
    async signOut(message) {
      const userId = 'token' in message ? message.token?.id as string | undefined : undefined
      if (userId) {
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'LOGOUT',
            resource: 'User',
            resourceId: userId,
          },
        }).catch(() => null)
      }
    },
  },
})
