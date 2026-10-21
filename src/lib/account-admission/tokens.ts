import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueToken(): string {
  return randomBytes(24).toString('base64url');
}

export function createInviteCode(): string {
  const seg1 = randomBytes(2).toString('hex').toUpperCase();
  const seg2 = randomBytes(2).toString('hex').toUpperCase();
  return `TAVI-${seg1}-${seg2}`;
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token.trim(), 'utf8').digest('base64url');
}
