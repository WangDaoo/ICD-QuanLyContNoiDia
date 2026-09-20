export const CONTAINER_NUMBER_PATTERN = /^[A-Z]{4}\d{7}$/;

const ISO_6346_LETTER_VALUES: Record<string, number> = {
  A: 10,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 23,
  M: 24,
  N: 25,
  O: 26,
  P: 27,
  Q: 28,
  R: 29,
  S: 30,
  T: 31,
  U: 32,
  V: 34,
  W: 35,
  X: 36,
  Y: 37,
  Z: 38,
};

export function normalizeContainerNumber(value: string): string {
  return value.replace(/\s+/g, '').trim().toUpperCase();
}

export function hasContainerNumberShape(value: string): boolean {
  return CONTAINER_NUMBER_PATTERN.test(normalizeContainerNumber(value));
}

export function calculateIso6346CheckDigit(value: string): number | null {
  const normalized = normalizeContainerNumber(value);
  const body = normalized.length === 11 ? normalized.slice(0, 10) : normalized;

  if (!/^[A-Z]{4}\d{6}$/.test(body)) return null;

  let sum = 0;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const numericValue = /\d/.test(char)
      ? Number(char)
      : ISO_6346_LETTER_VALUES[char];
    if (numericValue === undefined) return null;
    sum += numericValue * 2 ** index;
  }

  const remainder = sum % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidIso6346ContainerNumber(value: string): boolean {
  const normalized = normalizeContainerNumber(value);
  if (!CONTAINER_NUMBER_PATTERN.test(normalized)) return false;

  const expected = calculateIso6346CheckDigit(normalized);
  if (expected === null) return false;
  return expected === Number(normalized[10]);
}
