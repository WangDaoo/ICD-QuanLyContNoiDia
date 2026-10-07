export type ScannerMode = 'CONTAINER' | 'GATE_PASS';

export function parseScannedCode(
  value: string,
  mode: ScannerMode,
): { value: string; error?: never } | { value?: never; error: string } {
  const text = value.trim();
  if (mode === 'CONTAINER') {
    const code = text.toUpperCase().match(/\b[A-Z]{4}\d{7}\b/)?.[0];
    return code
      ? { value: code }
      : { error: 'Chưa đọc được số container. Đặt nhãn gồm 4 chữ cái và 7 chữ số vào khung.' };
  }
  return text.startsWith('gp1.') && text.length > 4
    ? { value: text }
    : {
        error:
          'Cần quét QR đầy đủ trên phiếu ra cổng. Mã phiếu dạng GP-001 không thay thế được QR.',
      };
}
