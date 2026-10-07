import { unwrapPage } from '../mappers/api-response.mapper';

export interface ListPageParams {
  page: number;
  pageSize: number;
}

export async function loadAllPages(
  fetchPage: (params: ListPageParams) => Promise<unknown>,
  pageSize = 100,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let page = 1;
  while (true) {
    const response = await fetchPage({ page, pageSize });
    const result = unwrapPage(response);
    rows.push(...result.data);
    const totalPages = result.meta?.totalPages;
    if (result.meta === undefined) {
      if (page !== 1 || result.total !== undefined) {
        throw new Error('Invalid pagination metadata from API');
      }
      return rows;
    }
    if (typeof totalPages !== 'number' || !Number.isSafeInteger(totalPages) || totalPages < 0) {
      throw new Error('Invalid pagination metadata from API');
    }
    const returnedPage = result.meta.page;
    const returnedPageSize = result.meta.pageSize;
    const total = result.meta.total !== undefined ? result.meta.total : result.total;
    if (
      (returnedPage !== undefined && returnedPage !== page) ||
      (returnedPageSize !== undefined &&
        (typeof returnedPageSize !== 'number' ||
          !Number.isSafeInteger(returnedPageSize) ||
          returnedPageSize < 1)) ||
      (total !== undefined &&
        (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0)) ||
      (totalPages === 0 && result.data.length > 0) ||
      (typeof total === 'number' &&
        typeof returnedPageSize === 'number' &&
        Math.ceil(total / returnedPageSize) !== totalPages)
    ) {
      throw new Error('Invalid pagination metadata from API');
    }
    if (page >= totalPages) {
      if (typeof total === 'number' && rows.length !== total) {
        throw new Error('Invalid pagination metadata from API');
      }
      return rows;
    }
    page++;
  }
}
