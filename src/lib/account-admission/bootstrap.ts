import { prisma } from '@/lib/prisma';
import { AccountAdmissionError } from './errors';
import { hashPassword } from './passwords';
import { isValidAccountEmail, normalizeAccountEmail } from './policy';
import { recordAuditLog } from './audit';

/**
 * Provisions or promotes a root Administrator account from the deployment host CLI
 * (`npm run bootstrap:admin -- --email <email> --password-stdin`).
 *
 * Security invariant: Never exposed via an HTTP API endpoint or public web route.
 */
export async function bootstrapAdmin(input: {
  email: string;
  password: string;
  name?: string | null;
}) {
  const email = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(input.email)) {
    throw new AccountAdmissionError(
      400,
      'invalid_email',
      'Enter a valid administrator email address.'
    );
  }

  if (!input.password || input.password.length < 8 || input.password.length > 128) {
    throw new AccountAdmissionError(
      400,
      'invalid_password',
      'Administrator password must be between 8 and 128 characters.'
    );
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const displayName = input.name?.trim() || email.split('@')[0] || 'Gauth Admin';

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
    });

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: displayName,
            passwordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
            planTier: 'PLUS',
            revokedAt: null,
            revokedReason: null,
            emailVerified: existing.emailVerified ?? now,
          },
        })
      : await tx.user.create({
          data: {
            email,
            name: displayName,
            passwordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
            planTier: 'PLUS',
            freeQueriesRemaining: 9999,
            aiProRemaining: 20,
            courseCreditsRemaining: 999,
            emailVerified: now,
          },
        });

    await tx.passwordCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        passwordHash,
        passwordChangedAt: now,
      },
      update: {
        passwordHash,
        passwordChangedAt: now,
        resetTokenHash: null,
        resetExpiresAt: null,
      },
    });

    return {
      user,
      created: !existing,
    };
  });

  await recordAuditLog({
    actorId: result.user.id,
    actorEmail: result.user.email,
    action: result.created ? 'CLI_BOOTSTRAP_ADMIN_CREATED' : 'CLI_BOOTSTRAP_ADMIN_PROMOTED',
    targetType: 'User',
    targetId: result.user.id,
    metadata: { email: result.user.email, role: 'ADMIN' },
  });

  return result;
}
