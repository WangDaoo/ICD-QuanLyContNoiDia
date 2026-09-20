import { apiClient } from '../../../services/api/api-client';
import type {
  ContainerTurnoverReport,
  GateActivityReport,
  OutstandingDebtReport,
  ReportDashboardSummary,
  ReportRangeFilter,
  RevenueReport,
  YardCurrentReport,
  YardEodReport,
} from '../report.types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapData<T>(value: unknown): T {
  if (isRecord(value) && 'data' in value) {
    return value.data as T;
  }
  return value as T;
}

async function downloadAuthenticatedBlob(
  path: string,
  defaultFilename: string,
): Promise<void> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Tải file thất bại với mã trạng thái ${response.status}`);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = /filename\*?=['"]?(?:UTF-8'')?([^;"']+)['"]?/i.exec(contentDisposition);
    if (match?.[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const reportApi = {
  async getDashboardSummary(timeZone?: string): Promise<ReportDashboardSummary> {
    const qs = timeZone ? `?timeZone=${encodeURIComponent(timeZone)}` : '';
    try {
      const response = await apiClient.get<unknown>(`/reports/dashboard/summary${qs}`);
      return unwrapData<ReportDashboardSummary>(response);
    } catch {
      // Fallback endpoint
      const response = await apiClient.get<unknown>(`/reports/summary${qs}`);
      return unwrapData<ReportDashboardSummary>(response);
    }
  },

  async getGateActivity(filter: ReportRangeFilter): Promise<GateActivityReport> {
    const params = new URLSearchParams();
    params.set('fromDate', filter.fromDate);
    params.set('toDate', filter.toDate);
    if (filter.timeZone) params.set('timeZone', filter.timeZone);

    const response = await apiClient.get<unknown>(`/reports/gate-activity?${params.toString()}`);
    return unwrapData<GateActivityReport>(response);
  },

  async getContainerTurnover(filter: ReportRangeFilter): Promise<ContainerTurnoverReport> {
    const params = new URLSearchParams();
    params.set('fromDate', filter.fromDate);
    params.set('toDate', filter.toDate);
    if (filter.timeZone) params.set('timeZone', filter.timeZone);

    const response = await apiClient.get<unknown>(`/reports/container-turnover?${params.toString()}`);
    return unwrapData<ContainerTurnoverReport>(response);
  },

  async getYardCurrent(): Promise<YardCurrentReport> {
    try {
      const response = await apiClient.get<unknown>('/reports/yard-inventory/current');
      return unwrapData<YardCurrentReport>(response);
    } catch {
      const response = await apiClient.get<unknown>('/reports/yard-inventory');
      return unwrapData<YardCurrentReport>(response);
    }
  },

  async getYardEod(date: string, timeZone?: string): Promise<YardEodReport> {
    const params = new URLSearchParams();
    params.set('date', date);
    if (timeZone) params.set('timeZone', timeZone);

    try {
      const response = await apiClient.get<unknown>(`/reports/yard-inventory/eod?${params.toString()}`);
      return unwrapData<YardEodReport>(response);
    } catch {
      const response = await apiClient.get<unknown>(`/reports/yard-inventory?${params.toString()}`);
      return unwrapData<YardEodReport>(response);
    }
  },

  async getRevenue(filter: ReportRangeFilter): Promise<RevenueReport> {
    const params = new URLSearchParams();
    params.set('fromDate', filter.fromDate);
    params.set('toDate', filter.toDate);
    if (filter.groupBy) params.set('groupBy', filter.groupBy);
    if (filter.timeZone) params.set('timeZone', filter.timeZone);

    const response = await apiClient.get<unknown>(`/reports/revenue?${params.toString()}`);
    return unwrapData<RevenueReport>(response);
  },

  async getOutstandingDebt(): Promise<OutstandingDebtReport> {
    const response = await apiClient.get<unknown>('/reports/outstanding-debt');
    return unwrapData<OutstandingDebtReport>(response);
  },

  async exportFullExcel(filter: ReportRangeFilter, yardEodDate?: string): Promise<void> {
    const params = new URLSearchParams();
    params.set('fromDate', filter.fromDate);
    params.set('toDate', filter.toDate);
    if (yardEodDate) params.set('yardEodDate', yardEodDate);
    if (filter.timeZone) params.set('timeZone', filter.timeZone);

    const filename = `icd-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    try {
      await downloadAuthenticatedBlob(`/reports/export/excel?${params.toString()}`, filename);
    } catch {
      await downloadAuthenticatedBlob(`/reports/export.xlsx?${params.toString()}`, filename);
    }
  },

  async exportYardEodExcel(date: string, timeZone?: string): Promise<void> {
    const params = new URLSearchParams();
    params.set('date', date);
    if (timeZone) params.set('timeZone', timeZone);

    const filename = `yard-inventory-eod-${date}.xlsx`;
    await downloadAuthenticatedBlob(`/reports/yard-inventory.xlsx?${params.toString()}`, filename);
  },
};
