export const ACCOUNT_ADMISSION_MODES = ['invitation-only', 'public'] as const;
export type AccountAdmissionMode = (typeof ACCOUNT_ADMISSION_MODES)[number];

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidAccountEmail(email: string): boolean {
  const normalized = normalizeAccountEmail(email);
  const separator = normalized.indexOf('@');
  return (
    normalized.length <= 320 &&
    separator > 0 &&
    separator === normalized.lastIndexOf('@') &&
    separator < normalized.length - 1 &&
    !/\s/.test(normalized)
  );
}

export function accountAdmissionMode(): AccountAdmissionMode {
  const configured = process.env.ACCOUNT_ADMISSION_MODE?.trim().toLowerCase();
  return configured === 'public' || configured === 'invitation-only'
    ? configured
    : 'invitation-only';
}
