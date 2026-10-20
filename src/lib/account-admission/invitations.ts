import { Prisma, type AccountInvitation } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AccountAdmissionError } from './errors';
import { isValidAccountEmail, normalizeAccountEmail } from './policy';
import { createInviteCode, createOpaqueToken, hashOpaqueToken } from './tokens';
import { recordAuditLog } from './audit';

const DEFAULT_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type GauthRole = 'ADMIN' | 'TUTOR' | 'STUDENT';

export type CreateAccountInvitationInput = {
  email: string;
  role?: GauthRole;
  maxUses?: number;
  invitedById?: string;
  invitedByEmail?: string;
  expiresAt?: Date;
  ttlHours?: number;
};

export type AccountInvitationGrant = {
  invitation: AccountInvitation;
  token: string;
  code: string;
};

export type PublicInvitationView = {
  id: string;
  code: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired' | 'invalid';
  maskedEmail: string | null;
  email?: string;
  expiresAt: Date | null;
};

function invitationExpiry(now: Date, requested?: Date, ttlHours?: number): Date {
  if (requested) {
    if (requested.getTime() <= now.getTime()) {
      throw new AccountAdmissionError(
        400,
        'invalid_expiry',
        'Invitation expiry must be in the future.'
      );
    }
    return requested;
  }
  const ms = ttlHours && ttlHours > 0 ? ttlHours * 3600 * 1000 : DEFAULT_INVITATION_TTL_MS;
  return new Date(now.getTime() + ms);
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export async function expirePendingInvitations(now = new Date()): Promise<number> {
  const result = await prisma.accountInvitation.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
    },
    data: {
      status: 'EXPIRED',
      activeForEmail: null,
      tokenHash: null,
    },
  });
  return result.count;
}

export async function createAccountInvitation(
  input: CreateAccountInvitationInput
): Promise<AccountInvitationGrant> {
  const normalizedEmail = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(input.email)) {
    throw new AccountAdmissionError(
      400,
      'invalid_email',
      'Enter a valid email address.'
    );
  }

  const token = createOpaqueToken();
  const code = createInviteCode();
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();
  const expiresAt = invitationExpiry(now, input.expiresAt, input.ttlHours);
  const role: GauthRole = input.role || 'STUDENT';
  const maxUses = Math.max(1, Math.min(100, input.maxUses || 1));

  try {
    await prisma.accountInvitation.updateMany({
      where: {
        activeForEmail: normalizedEmail,
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED',
        activeForEmail: null,
        tokenHash: null,
      },
    });

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new AccountAdmissionError(
        409,
        'already_member',
        'A Gauth account already exists for this email.'
      );
    }

    const active = await prisma.accountInvitation.findUnique({
      where: { activeForEmail: normalizedEmail },
      select: { id: true },
    });
    if (active) {
      throw new AccountAdmissionError(
        409,
        'invitation_exists',
        'An active invitation already exists for this email.'
      );
    }

    let inviterId = input.invitedById;
    if (!inviterId) {
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      inviterId = adminUser?.id;
    }

    const invitation = await prisma.accountInvitation.create({
      data: {
        code,
        email: input.email.trim(),
        normalizedEmail,
        activeForEmail: normalizedEmail,
        tokenHash,
        role,
        maxUses,
        usedCount: 0,
        invitedById: inviterId || null,
        expiresAt,
      },
    });

    await recordAuditLog({
      actorId: inviterId || null,
      actorEmail: input.invitedByEmail || 'admin@gauthmath.com',
      action: 'INVITATION_CREATED',
      targetType: 'AccountInvitation',
      targetId: invitation.id,
      metadata: {
        code: invitation.code,
        email: invitation.normalizedEmail,
        role: invitation.role,
        maxUses: invitation.maxUses,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });

    return {
      invitation,
      token,
      code,
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new AccountAdmissionError(
        409,
        'invitation_exists',
        'An active invitation already exists for this email.'
      );
    }
    throw error;
  }
}

export async function findInvitationByTokenOrCode(tokenOrCode: string) {
  const trimmed = tokenOrCode.trim();
  if (!trimmed) return null;

  const byCode = await prisma.accountInvitation.findUnique({
    where: { code: trimmed.toUpperCase() },
  });
  if (byCode) return byCode;

  const tokenHash = hashOpaqueToken(trimmed);
  return prisma.accountInvitation.findUnique({
    where: { tokenHash },
  });
}

export async function inspectAccountInvitation(
  tokenOrCode: string,
  now = new Date()
): Promise<PublicInvitationView> {
  const invitation = await findInvitationByTokenOrCode(tokenOrCode);

  if (!invitation) {
    return {
      id: '',
      code: '',
      role: 'STUDENT',
      status: 'invalid',
      maskedEmail: null,
      expiresAt: null,
    };
  }

  if (invitation.status === 'PENDING' && invitation.expiresAt <= now) {
    await prisma.accountInvitation.updateMany({
      where: { id: invitation.id, status: 'PENDING' },
      data: {
        status: 'EXPIRED',
        activeForEmail: null,
        tokenHash: null,
      },
    });
    return {
      id: invitation.id,
      code: invitation.code,
      role: invitation.role,
      status: 'expired',
      maskedEmail: maskEmail(invitation.email),
      expiresAt: invitation.expiresAt,
    };
  }

  return {
    id: invitation.id,
    code: invitation.code,
    role: invitation.role,
    status: invitation.status.toLowerCase() as PublicInvitationView['status'],
    maskedEmail: maskEmail(invitation.email),
    email: invitation.email,
    expiresAt: invitation.expiresAt,
  };
}

export async function revokeAccountInvitation(
  id: string,
  actor?: { id?: string; email?: string }
): Promise<AccountInvitation> {
  const now = new Date();
  const invitation = await prisma.accountInvitation.findUnique({
    where: { id },
  });
  if (!invitation) {
    throw new AccountAdmissionError(404, 'not_found', 'Invitation not found.');
  }
  if (invitation.status === 'REVOKED') {
    return invitation;
  }
  if (invitation.status !== 'PENDING') {
    throw new AccountAdmissionError(
      409,
      'invalid_transition',
      'Only a pending invitation can be revoked.'
    );
  }

  const updated = await prisma.accountInvitation.update({
    where: { id },
    data: {
      status: 'REVOKED',
      revokedAt: now,
      activeForEmail: null,
      tokenHash: null,
    },
  });

  await recordAuditLog({
    actorId: actor?.id || null,
    actorEmail: actor?.email || 'admin@gauthmath.com',
    action: 'INVITATION_REVOKED',
    targetType: 'AccountInvitation',
    targetId: updated.id,
    metadata: { code: updated.code, email: updated.normalizedEmail },
  });

  return updated;
}

export async function rotateAccountInvitation(
  id: string,
  expiresAt?: Date,
  actor?: { id?: string; email?: string }
): Promise<AccountInvitationGrant> {
  const token = createOpaqueToken();
  const code = createInviteCode();
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();
  const nextExpiry = invitationExpiry(now, expiresAt);

  const invitation = await prisma.accountInvitation.findUnique({
    where: { id },
  });
  if (!invitation) {
    throw new AccountAdmissionError(404, 'not_found', 'Invitation not found.');
  }
  if (invitation.status !== 'PENDING' || invitation.expiresAt <= now) {
    throw new AccountAdmissionError(
      409,
      'invalid_transition',
      'Only a pending invitation can be rotated.'
    );
  }

  const updated = await prisma.accountInvitation.update({
    where: { id },
    data: { code, tokenHash, expiresAt: nextExpiry },
  });

  await recordAuditLog({
    actorId: actor?.id || null,
    actorEmail: actor?.email || 'admin@gauthmath.com',
    action: 'INVITATION_ROTATED',
    targetType: 'AccountInvitation',
    targetId: updated.id,
    metadata: { newCode: updated.code, email: updated.normalizedEmail },
  });

  return {
    invitation: updated,
    token,
    code,
  };
}

export async function listAccountInvitations() {
  await expirePendingInvitations();
  return prisma.accountInvitation.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      email: true,
      role: true,
      status: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      createdAt: true,
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
      acceptedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}
