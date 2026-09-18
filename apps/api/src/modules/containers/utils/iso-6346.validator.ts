/**
 * ISO 6346 Container Number Validator and Check Digit Calculation
 *
 * Pattern: 4 letters (3 owner + 1 category) + 6 digits + 1 check digit
 * Letter values: A=10, B=12, ..., Z=38 (omits 11, 22, 33)
 */

const LETTER_VALUES: Record<string, number> = {
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

export class Iso6346Validator {
  private static readonly FORMAT_REGEX = /^[A-Z]{4}\d{7}$/;

  public static normalize(containerNumber: string): string {
    return containerNumber.trim().toUpperCase().replace(/\s+/g, '');
  }

  public static calculateCheckDigit(first10Chars: string): number {
    if (first10Chars.length !== 10) {
      throw new Error('ISO 6346 check digit calculation requires exactly 10 characters');
    }

    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const char = first10Chars.charAt(i);
      let value: number;

      if (char >= '0' && char <= '9') {
        value = parseInt(char, 10);
      } else if (char in LETTER_VALUES) {
        value = LETTER_VALUES[char]!;
      } else {
        throw new Error(`Invalid character for ISO 6346: ${char}`);
      }

      sum += value * Math.pow(2, i);
    }

    return (sum % 11) % 10;
  }

  public static validate(containerNumber: string): boolean {
    const normalized = this.normalize(containerNumber);

    if (!this.FORMAT_REGEX.test(normalized)) {
      return false;
    }

    const first10 = normalized.slice(0, 10);
    const expectedCheckDigit = this.calculateCheckDigit(first10);
    const actualCheckDigit = parseInt(normalized.charAt(10), 10);

    return expectedCheckDigit === actualCheckDigit;
  }
}
