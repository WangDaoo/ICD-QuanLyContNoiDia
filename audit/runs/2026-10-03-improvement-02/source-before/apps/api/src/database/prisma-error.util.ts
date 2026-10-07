/**
 * Kiểm tra Prisma unique constraint error.
 *
 * Đây là technical helper chung, không chứa
 * business logic.
 */
export function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (
    (
      error as {
        code?: unknown;
      }
    ).code === 'P2002'
  );
}
