import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';

export async function getActiveSessionUser() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;

  if (sessionUser?.id) {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });
    if (user && user.status !== 'REVOKED') {
      return user;
    }
    if (user && user.status === 'REVOKED') {
      return null;
    }
  }

  return null;
}

export async function getActiveOrDemoUser() {
  const sessionUser = await getActiveSessionUser();
  if (sessionUser) return sessionUser;

  // Fallback to default authenticated persona (Joshuah Powlowski from .cred) for unauthenticated preview
  const demoUser = await prisma.user.findFirst({
    where: { email: 'joshuah@gauthmath.com', status: 'ACTIVE' },
  });
  if (demoUser) return demoUser;

  return prisma.user.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
}
