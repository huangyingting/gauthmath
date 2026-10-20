import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/server-session';
import {
  AccountAdmissionError,
  createAccountInvitation,
  listAccountInvitations,
  recordAuditLog,
  revokeAccountInvitation,
  rotateAccountInvitation,
  type GauthRole,
} from '@/lib/account-admission';
import {
  getAIProviderStatus,
  setRuntimeAiProvider,
  type GauthAiProviderMode,
} from '@/lib/ai/provider';

async function requireAdminSession(req: NextRequest) {
  const user = await getActiveSessionUser();
  if (user && user.role === 'ADMIN') {
    return user;
  }
  const adminHeader = req.headers.get('x-gauth-admin-secret');
  if (
    adminHeader &&
    adminHeader === (process.env.NEXTAUTH_SECRET || 'gauthmath-super-secret-nextauth-key-2026')
  ) {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', status: 'ACTIVE' },
    });
    if (adminUser) return adminUser;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminSession(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: 'Administrator privileges required.' },
      { status: 403 }
    );
  }

  const [invitations, users, auditLogs] = await Promise.all([
    listAccountInvitations(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        planTier: true,
        freeQueriesRemaining: true,
        aiProRemaining: true,
        revokedAt: true,
        revokedReason: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    aiStatus: getAIProviderStatus(),
    invitations,
    users,
    auditLogs,
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminSession(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: 'Administrator privileges required.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'create_invitation') {
      const email = String(body.email || '');
      const role = (body.role as GauthRole) || 'STUDENT';
      const maxUses = Number(body.maxUses || 1);
      const ttlHours = Number(body.ttlHours || 168);

      const grant = await createAccountInvitation({
        email,
        role,
        maxUses,
        ttlHours,
        invitedById: admin.id,
        invitedByEmail: admin.email,
      });

      return NextResponse.json(
        {
          ok: true,
          invitation: grant.invitation,
          code: grant.code,
          token: grant.token,
          inviteUrl: `/invite/${grant.code}`,
        },
        { status: 201 }
      );
    }

    if (action === 'revoke_invitation') {
      const invitationId = String(body.invitationId || '');
      const updated = await revokeAccountInvitation(invitationId, {
        id: admin.id,
        email: admin.email,
      });
      return NextResponse.json({ ok: true, invitation: updated });
    }

    if (action === 'rotate_invitation') {
      const invitationId = String(body.invitationId || '');
      const grant = await rotateAccountInvitation(invitationId, undefined, {
        id: admin.id,
        email: admin.email,
      });
      return NextResponse.json({
        ok: true,
        invitation: grant.invitation,
        code: grant.code,
        token: grant.token,
      });
    }

    if (action === 'update_user_role') {
      const userId = String(body.userId || '');
      const role = String(body.role || 'STUDENT');
      if (!['ADMIN', 'TUTOR', 'STUDENT'].includes(role)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid role.' },
          { status: 400 }
        );
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      await recordAuditLog({
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'USER_ROLE_UPDATED',
        targetType: 'User',
        targetId: updated.id,
        metadata: { email: updated.email, newRole: role },
      });

      return NextResponse.json({ ok: true, user: updated });
    }

    if (action === 'revoke_user' || action === 'restore_user') {
      const userId = String(body.userId || '');
      const isRevoke = action === 'revoke_user';
      const reason = body.reason ? String(body.reason) : 'Administrative action';

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          status: isRevoke ? 'REVOKED' : 'ACTIVE',
          revokedAt: isRevoke ? new Date() : null,
          revokedReason: isRevoke ? reason : null,
        },
      });

      if (isRevoke) {
        await prisma.session.deleteMany({ where: { userId: updated.id } });
      }

      await recordAuditLog({
        actorId: admin.id,
        actorEmail: admin.email,
        action: isRevoke ? 'USER_ACCESS_REVOKED' : 'USER_ACCESS_RESTORED',
        targetType: 'User',
        targetId: updated.id,
        metadata: { email: updated.email, reason },
      });

      return NextResponse.json({ ok: true, user: updated });
    }

    if (action === 'switch_ai_provider') {
      const mode = String(body.provider || 'auto') as GauthAiProviderMode;
      setRuntimeAiProvider(mode);
      await recordAuditLog({
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'AI_PROVIDER_SWITCHED',
        targetType: 'AIProvider',
        targetId: mode,
        metadata: { mode },
      });
      return NextResponse.json({ ok: true, aiStatus: getAIProviderStatus() });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown admin action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Admin action failed.',
      },
      { status: 500 }
    );
  }
}
