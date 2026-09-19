import { Injectable } from '@nestjs/common';
import SftpClient from 'ssh2-sftp-client';
import { posix } from 'node:path';

import {
  EdiDeliveryInput,
  EdiDeliveryResult,
  EdiTransportClient,
} from './edi-transport.interface';

@Injectable()
export class EdiSftpTransport implements EdiTransportClient {
  async deliver(input: EdiDeliveryInput): Promise<EdiDeliveryResult> {
    const url = new URL(input.routing.partnerTarget);

    if (url.protocol !== 'sftp:') {
      throw new Error('EDI SFTP partnerTarget must use sftp://.');
    }

    const credentialRef = input.routing.credentialRef;

    if (!credentialRef) {
      throw new Error('EDI SFTP credentialRef is required.');
    }

    const rawSecret = process.env[credentialRef];

    if (!rawSecret) {
      throw new Error(
        `EDI SFTP credential ${credentialRef} is not configured.`,
      );
    }

    const credential = this.parseCredential(rawSecret);

    const fileName = `${input.messageType}_${input.messageId}.json`;
    const directory = url.pathname || '/';
    const finalPath = posix.join(directory, fileName);
    const temporaryPath = `${finalPath}.part`;

    const client = new SftpClient();

    try {
      await client.connect({
        host: url.hostname,
        port: url.port ? Number(url.port) : 22,
        username: decodeURIComponent(url.username),
        ...credential,
      });

      /**
       * Retry idempotence:
       * file cuối đã tồn tại thì coi là delivered.
       */
      const existing = await client.exists(finalPath);

      if (existing) {
        return {
          externalReference: finalPath,
        };
      }

      const body = Buffer.from(JSON.stringify(input.payload), 'utf8');

      await client.put(body, temporaryPath);
      await client.rename(temporaryPath, finalPath);

      return {
        externalReference: finalPath,
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private parseCredential(raw: string): {
    password?: string;
    privateKey?: string;
    passphrase?: string;
  } {
    try {
      const value = JSON.parse(raw) as {
        password?: string;
        privateKey?: string;
        passphrase?: string;
      };

      return value;
    } catch {
      return {
        password: raw,
      };
    }
  }
}
