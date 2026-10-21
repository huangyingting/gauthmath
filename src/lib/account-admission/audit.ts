import { prisma } from '@/lib/prisma';

export interface RecordAuditLogInput {
  actorId?: string | null;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function recordAuditLog(input: RecordAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId || null,
      actorEmail: input.actorEmail || 'system@tavi.test',
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId || null,
      metadataJson: JSON.stringify(input.metadata || {}),
      ipAddress: input.ipAddress || '127.0.0.1',
    },
  });
}
