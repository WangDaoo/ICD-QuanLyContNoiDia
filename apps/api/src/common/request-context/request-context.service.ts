import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

interface RequestContextStore {
  requestId: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(requestId: string, callback: () => T): T {
    return this.storage.run(
      {
        requestId,
      },
      callback,
    );
  }

  getRequestId(): string | null {
    return this.storage.getStore()?.requestId ?? null;
  }

  getRequestIdOrCreate(): string {
    return this.getRequestId() ?? `system_${randomUUID()}`;
  }
}
