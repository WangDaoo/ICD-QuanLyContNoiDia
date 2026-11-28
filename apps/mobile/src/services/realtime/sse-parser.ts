/**
 * Bộ tách sự kiện Server-Sent Events theo đặc tả WHATWG (phần dùng trong ICD).
 *
 * Nhận từng đoạn văn bản bất kỳ từ luồng `fetch` và phát ra sự kiện hoàn chỉnh
 * khi gặp dòng trống. Dòng chú thích (`: ping`) bị bỏ qua.
 */
export interface SseEvent {
  event: string;
  data: string;
  id?: string;
}

export interface SseParser {
  feed(chunk: string): void;
  /** Bỏ phần dở dang khi kết nối bị cắt. */
  reset(): void;
}

/**
 * @param onRetry Nhận thời gian chờ kết nối lại do server đề nghị (dòng `retry:`),
 *   áp dụng ngay cả khi khối đó không có `data`.
 */
export function createSseParser(
  onEvent: (event: SseEvent) => void,
  onRetry?: (ms: number) => void,
): SseParser {
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];
  let lastId: string | undefined;

  const dispatch = () => {
    // Theo đặc tả: khối không có dòng `data` thì không phát sự kiện.
    if (dataLines.length === 0) {
      eventName = '';
      return;
    }
    const event: SseEvent = { event: eventName || 'message', data: dataLines.join('\n') };
    if (lastId !== undefined) event.id = lastId;
    eventName = '';
    dataLines = [];
    onEvent(event);
  };

  const processLine = (line: string) => {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    switch (field) {
      case 'event':
        eventName = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        if (!value.includes('\0')) lastId = value;
        break;
      case 'retry':
        if (/^\d+$/.test(value)) onRetry?.(Number(value));
        break;
      default:
        break;
    }
  };

  return {
    feed(chunk: string) {
      let text = buffer + chunk;
      // Đoạn có thể kết thúc giữa CR LF: giữ CR lại để ghép với LF của đoạn sau.
      const pendingCr = text.endsWith('\r');
      if (pendingCr) text = text.slice(0, -1);
      // Chấp nhận LF, CR LF và CR làm ký tự xuống dòng.
      const lines = text.split(/\r\n|\r|\n/);
      buffer = (lines.pop() ?? '') + (pendingCr ? '\r' : '');
      for (const line of lines) processLine(line);
    },
    reset() {
      buffer = '';
      eventName = '';
      dataLines = [];
    },
  };
}
