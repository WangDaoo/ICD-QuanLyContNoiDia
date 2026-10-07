import { asRecord, unwrapData, unwrapList, unwrapPage } from '../mappers/api-response.mapper';
import { mapLiveCollections, type LiveCollections } from '../mappers/live-view.mapper';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function responseRecord(response: unknown): Record<string, unknown> {
  return asRecord(unwrapData<unknown>(response));
}

export function viewList<K extends keyof LiveCollections>(
  key: K,
  response: unknown,
): LiveCollections[K] {
  return mapLiveCollections({ [key]: unwrapList(response) }, '')[key];
}

export function viewPage<K extends keyof LiveCollections>(key: K, response: unknown) {
  const page = unwrapPage(response);
  return { ...page, data: mapLiveCollections({ [key]: page.data }, '')[key] };
}
