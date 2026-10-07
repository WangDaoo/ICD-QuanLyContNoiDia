import { Injectable } from '@nestjs/common';

import {
  EdiDeliveryInput,
  EdiDeliveryResult,
  EdiTransportClient,
} from './edi-transport.interface';

@Injectable()
export class EdiHttpsTransport implements EdiTransportClient {
  async deliver(input: EdiDeliveryInput): Promise<EdiDeliveryResult> {
    const { partnerTarget, credentialRef, timeoutMs } = input.routing;

    const secret = credentialRef ? process.env[credentialRef] : undefined;

    if (credentialRef && !secret) {
      throw new Error(
        `EDI credential environment variable ${credentialRef} is not configured.`,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(partnerTarget, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey,
          ...(input.requestId ? { 'X-Request-Id': input.requestId } : {}),
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify(input.payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `EDI HTTPS ${response.status}: ${text.slice(0, 1000)}`,
        );
      }

      return {
        externalReference:
          response.headers.get('x-external-reference') ??
          response.headers.get('x-request-id'),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
