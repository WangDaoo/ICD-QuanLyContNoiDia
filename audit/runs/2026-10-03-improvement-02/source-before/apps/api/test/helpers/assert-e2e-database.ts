import { PrismaService } from '../../src/database/prisma.service';

export async function assertE2EDatabase(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ databaseName: string | null }>>`
    SELECT DATABASE() AS databaseName
  `;

  const databaseName = rows[0]?.databaseName;

  if (!databaseName || !databaseName.endsWith('_e2e')) {
    throw new Error(`E2E safety check failed. Current database: ${databaseName ?? 'unknown'}`);
  }
}
