export interface CommandResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  [key: string]: any;
}

export async function executeOperation<T>(write: () => Promise<T>, refresh: () => Promise<void>): Promise<CommandResult<T>> {
  let data: T;
  try {
    data = await write();
  } catch (error: any) {
    return { success: false, message: error?.message || 'Không thể lưu thao tác. Kiểm tra kết nối backend.' };
  }
  try {
    await refresh();
    return { success: true, message: 'Đã lưu trên hệ thống.', data };
  } catch {
    return { success: true, message: 'Đã lưu trên hệ thống nhưng chưa tải lại được dữ liệu. Vui lòng làm mới.', data };
  }
}
