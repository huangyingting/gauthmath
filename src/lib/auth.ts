import type { NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';
import {
  normalizeAccountEmail,
  recordAuditLog,
  verifyPassword,
} from './account-admission';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth',
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'name@institution.edu' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const email = normalizeAccountEmail(credentials.email);
        const user = await prisma.user.findUnique({
          where: { email },
          include: { passwordCredential: true },
        });

        if (!user) {
          return null;
        }

        if (user.status === 'REVOKED') {
          await recordAuditLog({
            actorId: user.id,
            actorEmail: user.email,
            action: 'REVOKED_USER_LOGIN_BLOCKED',
            targetType: 'User',
            targetId: user.id,
          });
          throw new Error('ACCOUNT_REVOKED');
        }

        const storedHash =
          user.passwordCredential?.passwordHash || user.passwordHash || null;
        if (!storedHash) {
          return null;
        }

        const valid = await verifyPassword(credentials.password, storedHash);
        if (!valid) {
          return null;
        }

        await recordAuditLog({
          actorId: user.id,
          actorEmail: user.email,
          action: 'USER_SIGNED_IN',
          targetType: 'User',
          targetId: user.id,
          metadata: { role: user.role },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          planTier: user.planTier,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const email = normalizeAccountEmail(user.email);
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing?.status === 'REVOKED') {
          await recordAuditLog({
            actorId: existing.id,
            actorEmail: existing.email,
            action: 'REVOKED_USER_LOGIN_BLOCKED',
            targetType: 'User',
            targetId: existing.id,
          });
          return false;
        }
        await recordAuditLog({
          actorId: existing?.id,
          actorEmail: email,
          action: 'USER_GOOGLE_SIGNED_IN',
          targetType: 'User',
          targetId: existing?.id || email,
          metadata: { provider: 'google' },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role || 'STUDENT';
        token.status = (user as { status?: string }).status || 'ACTIVE';
        token.planTier = (user as { planTier?: string }).planTier || 'FREE';
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, planTier: true, name: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.planTier = dbUser.planTier;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id?: string;
          role?: string;
          status?: string;
          planTier?: string;
        };
        u.id = (token.id as string) || '';
        u.role = (token.role as string) || 'STUDENT';
        u.status = (token.status as string) || 'ACTIVE';
        u.planTier = (token.planTier as string) || 'FREE';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'gauthmath-super-secret-nextauth-key-2026',
};
