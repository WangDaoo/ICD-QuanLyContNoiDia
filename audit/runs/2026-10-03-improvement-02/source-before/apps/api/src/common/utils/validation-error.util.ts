import type { ValidationError } from 'class-validator';

export interface ValidationFieldError {
  field: string;
  constraints: string[];
}

export function flattenValidationErrors(
  errors: ValidationError[],
  prefix = '',
): ValidationFieldError[] {
  const result: ValidationFieldError[] = [];

  for (const error of errors) {
    const field = prefix ? `${prefix}.${error.property}` : error.property;

    if (error.constraints) {
      result.push({
        field,
        constraints: Object.keys(error.constraints),
      });
    }

    if (error.children && error.children.length > 0) {
      result.push(...flattenValidationErrors(error.children, field));
    }
  }

  return result;
}
