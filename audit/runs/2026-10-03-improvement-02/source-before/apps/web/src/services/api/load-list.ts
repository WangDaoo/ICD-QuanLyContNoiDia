import { unwrapPage } from '../mappers/api-response.mapper';

export interface ListPageParams {
  page: number;
  pageSize: number;
}

interface PaginationMeta {
  totalPages?: number;
}

export async function loadAllPages<T>(
  fetchPage: (params: ListPageParams) => Promise<unknown>,
  pageSize = 100,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  while (true) {
    const response = await fetchPage({ page, pageSize });
    const result = unwrapPage<T>(response);
    rows.push(...result.data);
    const meta = (result.meta ?? (response as { meta?: PaginationMeta } | null)?.meta) as PaginationMeta | undefined;
    if (!meta?.totalPages || page >= meta.totalPages) return rows;
    page++;
  }
}
