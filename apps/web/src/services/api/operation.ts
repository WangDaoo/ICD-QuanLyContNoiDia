import type { GatePass, TransportHandover } from '../../types';

export interface CommandResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  refreshStatus?: 'refreshed' | 'failed';
  outcome?: 'confirmed' | 'unknown';
  apiKey?: string;
  plainApiKey?: string;
  gatePass?: GatePass;
  handover?: TransportHandover;
  sent?: number;
}

export async function executeOperation<T>(
  write: () => Promise<T>,
  refresh: () => Promise<void>,
): Promise<CommandResult<T>> {
  let data: T;
  try {
    data = await write();
  } catch (error: unknown) {
    if (error !== null && typeof error === 'object' && 'status' in error && error.status === 0) {
      return {
        success: false,
        outcome: 'unknown',
        message:
          'Chưa xác định kết quả trên server. Giữ bản nháp và kiểm tra trạng thái trước khi gửi lại.',
      };
    }
    const message =
      error instanceof Error
        ? error.message
        : error !== null &&
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string'
          ? error.message
          : '';
    return {
      success: false,
      outcome: 'confirmed',
      message: message || 'Không thể lưu thao tác. Kiểm tra kết nối backend.',
    };
  }
  try {
    await refresh();
    return {
      success: true,
      outcome: 'confirmed',
      message: 'Đã lưu trên hệ thống.',
      data,
      refreshStatus: 'refreshed',
    };
  } catch {
    return {
      success: true,
      outcome: 'confirmed',
      message: 'Đã lưu trên hệ thống nhưng chưa tải lại được dữ liệu. Vui lòng làm mới.',
      data,
      refreshStatus: 'failed',
    };
  }
}
