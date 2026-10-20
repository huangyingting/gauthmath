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
  return getActiveSessionUser();
}
