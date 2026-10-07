import 'reflect-metadata';

import { getPaginationMeta, PaginationQueryDto } from './pagination-query.dto';

describe('PaginationQueryDto', () => {
  it('provides standard pagination defaults', () => {
    const query = new PaginationQueryDto();

    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(20);
    expect(query.sortOrder).toBe('desc');
  });

  it('builds standard list metadata', () => {
    expect(getPaginationMeta(2, 20, 41)).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });
});
