import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveSqliteUrl(rawUrl: string): string {
  if (!rawUrl.startsWith('file:')) return rawUrl;
  const relPath = rawUrl.slice('file:'.length);
  if (relPath.startsWith('/') || relPath === ':memory:') return rawUrl;
  const resolved = path.join(process.cwd(), 'prisma', relPath.replace(/^\.\//, ''));
  return `file:${resolved}`;
}

function createPrismaClient(): PrismaClient {
  const rawUrl = (process.env.DATABASE_URL || 'file:./dev.db').trim();
  if (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://')) {
    const parsed = new URL(rawUrl);
    const schema = parsed.searchParams.get('schema') || undefined;
    return new PrismaClient({
      adapter: new PrismaPg(rawUrl, schema ? { schema } : undefined),
      log: ['error'],
    });
  }

  const sqliteUrl = resolveSqliteUrl(rawUrl);
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: sqliteUrl }),
    log: ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
