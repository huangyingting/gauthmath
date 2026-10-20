import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveOrDemoUser } from '@/lib/server-session';
import { recordAuditLog } from '@/lib/account-admission';

export async function GET() {
  const user = await getActiveOrDemoUser();
  if (!user) {
    return NextResponse.json({
      ok: true,
      user: null,
      subscription: {
        planTier: 'FREE',
        billingCycle: 'yearly',
        freeQueriesRemaining: 3,
        aiProRemaining: 1,
        courseCreditsRemaining: 3,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    subscription: {
      planTier: user.planTier,
      billingCycle: user.billingCycle,
      freeQueriesRemaining: user.freeQueriesRemaining,
      aiProRemaining: user.aiProRemaining,
      courseCreditsRemaining: user.courseCreditsRemaining,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const planTier = body.planTier === 'FREE' ? 'FREE' : 'PLUS';
  const billingCycle = ['monthly', 'quarterly', 'yearly'].includes(
    body.billingCycle
  )
    ? body.billingCycle
    : 'yearly';

  const user = await getActiveOrDemoUser();
  if (!user) {
    return NextResponse.json({
      ok: true,
      subscription: {
        planTier,
        billingCycle,
        freeQueriesRemaining: planTier === 'PLUS' ? 9999 : 3,
        aiProRemaining: planTier === 'PLUS' ? 20 : 1,
        courseCreditsRemaining: planTier === 'PLUS' ? 999 : 3,
      },
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      planTier,
      billingCycle,
      freeQueriesRemaining: planTier === 'PLUS' ? 9999 : 5,
      aiProRemaining: planTier === 'PLUS' ? 20 : 2,
      courseCreditsRemaining: planTier === 'PLUS' ? 999 : 3,
    },
  });

  await recordAuditLog({
    actorId: updated.id,
    actorEmail: updated.email,
    action: planTier === 'PLUS' ? 'SUBSCRIPTION_UPGRADED_PLUS' : 'SUBSCRIPTION_RESET_FREE',
    targetType: 'User',
    targetId: updated.id,
    metadata: { planTier, billingCycle },
  });

  return NextResponse.json({
    ok: true,
    subscription: {
      planTier: updated.planTier,
      billingCycle: updated.billingCycle,
      freeQueriesRemaining: updated.freeQueriesRemaining,
      aiProRemaining: updated.aiProRemaining,
      courseCreditsRemaining: updated.courseCreditsRemaining,
    },
  });
}
