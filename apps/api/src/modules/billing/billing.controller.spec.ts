import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { BillingController } from './billing.controller';

describe('BillingController HTTP status', () => {
  it('returns 200 OK for the read-only billing preview instead of the POST default 201', () => {
    const handler = Object.getOwnPropertyDescriptor(BillingController.prototype, 'previewBilling')?.value as object;

    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
  });
});
