import { NextRequest, NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  accountAdmissionMode,
  inspectAccountInvitation,
  registerWithInvitation,
} from '@/lib/account-admission';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  if (!token.trim()) {
    return NextResponse.json({
      admissionMode: accountAdmissionMode(),
      invitation: null,
    });
  }
  const view = await inspectAccountInvitation(token);
  return NextResponse.json({
    admissionMode: accountAdmissionMode(),
    invitation: view,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '');
    const password = String(body.password || '');
    const name = body.name ? String(body.name) : null;
    const tokenOrCode = String(body.invitationCode || body.token || '');

    const { user, invitation } = await registerWithInvitation({
      email,
      password,
      name,
      tokenOrCode,
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          planTier: user.planTier,
        },
        invitationCode: invitation.code,
      },
      { status: 201 }
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
        code: 'internal_error',
        error: error instanceof Error ? error.message : 'Registration failed.',
      },
      { status: 500 }
    );
  }
}
