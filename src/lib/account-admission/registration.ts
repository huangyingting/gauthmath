import { prisma } from '@/lib/prisma';
import { AccountAdmissionError } from './errors';
import { hashPassword } from './passwords';
import {
  accountAdmissionMode,
  isValidAccountEmail,
  normalizeAccountEmail,
} from './policy';
import { findInvitationByTokenOrCode } from './invitations';
import { recordAuditLog } from './audit';

export type InvitationRegistrationInput = {
  email: string;
  password: string;
  name?: string | null;
  tokenOrCode: string;
  ipAddress?: string;
};

function normalizedName(name: string | null | undefined, email: string): string {
  const value = name?.trim();
  if (value) return value.slice(0, 120);
  return email.split('@')[0] || 'Tavi Learner';
}

export async function registerWithInvitation(
  input: InvitationRegistrationInput
) {
  if (accountAdmissionMode() !== 'invitation-only') {
    throw new AccountAdmissionError(
      409,
      'mode_mismatch',
      'Invitation registration is not enabled.'
    );
  }

  if (!input.tokenOrCode || !input.tokenOrCode.trim()) {
    throw new AccountAdmissionError(
      403,
      'invitation_required',
      'An invitation code or link is required to register.'
    );
  }

  if (!isValidAccountEmail(input.email)) {
    throw new AccountAdmissionError(
      400,
      'invalid_email',
      'Enter a valid email address.'
    );
  }

  const normalizedEmail = normalizeAccountEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const invitation = await findInvitationByTokenOrCode(input.tokenOrCode);
  if (!invitation) {
    throw new AccountAdmissionError(
      410,
      'invalid_invitation',
      'This invitation code is invalid or does not exist.'
    );
  }

  if (invitation.status === 'REVOKED') {
    throw new AccountAdmissionError(
      410,
      'revoked_invitation',
      'This invitation code has been revoked by an administrator.'
    );
  }

  if (invitation.status === 'ACCEPTED' || invitation.usedCount >= invitation.maxUses) {
    throw new AccountAdmissionError(
      410,
      'used_invitation',
      'This single-use invitation code has already been redeemed.'
    );
  }

  if (invitation.status !== 'PENDING' || invitation.expiresAt <= now) {
    await prisma.accountInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'EXPIRED',
        activeForEmail: null,
        tokenHash: null,
      },
    });
    throw new AccountAdmissionError(
      410,
      'expired',
      'This invitation code has expired.'
    );
  }

  if (invitation.normalizedEmail !== normalizedEmail) {
    throw new AccountAdmissionError(
      403,
      'email_mismatch',
      `This invitation was issued for a different email address (${invitation.email}).`
    );
  }

  const nextUsedCount = invitation.usedCount + 1;
  const exhausted = nextUsedCount >= invitation.maxUses;

  const { user, updatedInvitation } = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      throw new AccountAdmissionError(
        409,
        'already_member',
        'A Tavi account already exists for this email.'
      );
    }

    // Atomic conditional claim on the invitation row to prevent concurrent double-redemption
    const claimed = await tx.accountInvitation.updateMany({
      where: {
        id: invitation.id,
        status: 'PENDING',
        usedCount: invitation.usedCount,
        expiresAt: { gt: now },
      },
      data: {
        status: exhausted ? 'ACCEPTED' : 'PENDING',
        usedCount: nextUsedCount,
        acceptedAt: now,
        activeForEmail: exhausted ? null : invitation.activeForEmail,
        tokenHash: exhausted ? null : invitation.tokenHash,
      },
    });

    if (claimed.count !== 1) {
      throw new AccountAdmissionError(
        410,
        'used_invitation',
        'This single-use invitation code has already been redeemed.'
      );
    }

    const createdUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        emailVerified: now,
        name: normalizedName(input.name, normalizedEmail),
        role: invitation.role || 'STUDENT',
        status: 'ACTIVE',
        planTier:
          invitation.role === 'ADMIN' || invitation.role === 'TUTOR'
            ? 'PLUS'
            : 'FREE',
        freeQueriesRemaining: invitation.role === 'STUDENT' ? 5 : 999,
        aiProRemaining: invitation.role === 'STUDENT' ? 2 : 20,
        courseCreditsRemaining: 5,
        passwordHash,
        passwordCredential: {
          create: { passwordHash, passwordChangedAt: now },
        },
      },
    });

    const finalInvitation = await tx.accountInvitation.update({
      where: { id: invitation.id },
      data: { acceptedById: createdUser.id },
    });

    return { user: createdUser, updatedInvitation: finalInvitation };
  });

  await recordAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'USER_REGISTERED_WITH_INVITE',
    targetType: 'User',
    targetId: user.id,
    metadata: {
      invitationId: updatedInvitation.id,
      invitationCode: updatedInvitation.code,
      assignedRole: user.role,
    },
  });

  return { user, invitation: updatedInvitation };
}
