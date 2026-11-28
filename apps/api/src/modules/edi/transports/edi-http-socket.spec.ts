import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { EdiOutboundFormat, EdiTransport } from '../../../generated/prisma/client';
import { EdiHttpsTransport } from './edi-https.transport';

describe('EDI transport with a local partner HTTP endpoint', () => {
  async function exercise(
    handler: (request: IncomingMessage, response: ServerResponse) => void,
    run: (target: string) => Promise<void>,
  ) {
    const server = createServer(handler);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/codeco`); }
    finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }

  function input(target: string, timeoutMs = 1000) {
    return {
      messageId: 'audit-message', messageType: 'CODECO_GATE_IN',
      idempotencyKey: 'audit-idempotency', requestId: 'audit-request',
      payload: { containerNumber: 'AUDU1234567', event: 'GATE_IN' },
      routing: {
        routeId: 'audit-route', icdId: 'audit-site', transport: EdiTransport.HTTPS,
        outboundFormat: EdiOutboundFormat.CODECO_CANONICAL_JSON_V1,
        partnerTarget: target, credentialRef: null, hostKeySha256: null, timeoutMs,
      },
    };
  }

  it('delivers JSON and correlation headers and preserves the partner receipt', async () => {
    let body = '';
    let headers: IncomingMessage['headers'] = {};
    await exercise((request, response) => {
      headers = request.headers;
      request.on('data', chunk => { body += chunk.toString(); });
      request.on('end', () => {
        response.writeHead(200, { 'x-external-reference': 'audit-receipt' });
        response.end('{}');
      });
    }, async target => {
      const result = await new EdiHttpsTransport().deliver(input(target));
      expect(result.externalReference).toBe('audit-receipt');
      expect(JSON.parse(body)).toEqual(input(target).payload);
      expect(headers['idempotency-key']).toBe('audit-idempotency');
      expect(headers['x-request-id']).toBe('audit-request');
    });
  });

  it('rejects an unsuccessful partner response for dispatcher retry', async () => {
    await exercise((_request, response) => { response.writeHead(503); response.end('Unavailable'); },
      async target => { await expect(new EdiHttpsTransport().deliver(input(target))).rejects.toThrow('503'); });
  });

  it('aborts a partner request that exceeds its configured timeout', async () => {
    await exercise(() => {}, async target => {
      await expect(new EdiHttpsTransport().deliver(input(target, 50))).rejects.toThrow();
    });
  });
});
