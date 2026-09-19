export function buildYardSlotCode(
  blockCode: string,
  rowNo: string,
  bayNo: string,
  tierNo: string,
): string {
  return [blockCode, rowNo, bayNo, tierNo].join('/');
}
