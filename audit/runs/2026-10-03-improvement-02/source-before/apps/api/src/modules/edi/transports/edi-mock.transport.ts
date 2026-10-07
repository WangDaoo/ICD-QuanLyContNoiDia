import { Injectable } from '@nestjs/common';

import {
  EdiDeliveryInput,
  EdiDeliveryResult,
  EdiTransportClient,
} from './edi-transport.interface';

@Injectable()
export class EdiMockTransport implements EdiTransportClient {
  async deliver(input: EdiDeliveryInput): Promise<EdiDeliveryResult> {
    return {
      externalReference: `MOCK:${input.messageId}`,
    };
  }
}
