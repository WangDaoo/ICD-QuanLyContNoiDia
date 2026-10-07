from pathlib import Path

path = Path('apps/web/src/services/mappers/api-response.mapper.ts')
s = path.read_text(encoding='utf-8')
start = s.index('export function unwrapData')
end = s.index('export function asString', start)
s = s[:start] + '''export function unwrapData<T = unknown>(response: unknown, fallback?: T): unknown {
  const data = isRecord(response) && 'data' in response ? response.data : response;
  return data === undefined || data === null ? fallback : data;
}

export function unwrapList(response: unknown): unknown[] {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  if (isRecord(data)) {
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) return data.items;
  }
  // A malformed transport response cannot claim that a safety collection is empty.
  throw new Error('Invalid list response from API');
}

export function unwrapPage(response: unknown): PageResult<unknown> {
  const source = asRecord(response);
  const nested = asRecord(source.data);
  const metaValue = nested.meta ?? source.meta;
  const meta = isRecord(metaValue) ? metaValue : undefined;
  const totalValue = nested.total ?? source.total ?? meta?.total;
  const total = typeof totalValue === 'number' && Number.isFinite(totalValue) ? totalValue : undefined;
  return { data: unwrapList(response), meta, total };
}

''' + s[end:]
path.write_text(s, encoding='utf-8')

path = Path('apps/web/src/services/api/load-list.ts')
path.write_text('''import { unwrapPage } from '../mappers/api-response.mapper';

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
    if (totalPages === undefined) return rows;
    if (typeof totalPages !== 'number' || !Number.isSafeInteger(totalPages) || totalPages < 0) {
      throw new Error('Invalid pagination metadata from API');
    }
    if (page >= totalPages) return rows;
    page++;
  }
}
''', encoding='utf-8')

for path in Path('apps/web/src/services').rglob('*.ts'):
    s = path.read_text(encoding='utf-8')
    if 'unwrapList<unknown>' in s or 'unwrapPage<unknown>' in s or 'loadAllPages<Row>' in s:
        s = s.replace('unwrapList<unknown>', 'unwrapList').replace('unwrapPage<unknown>', 'unwrapPage').replace('loadAllPages<Row>', 'loadAllPages')
        path.write_text(s, encoding='utf-8')
