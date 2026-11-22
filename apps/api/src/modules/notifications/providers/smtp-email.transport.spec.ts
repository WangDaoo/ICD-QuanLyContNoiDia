import { createServer, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { SmtpEmailProvider } from './smtp-email.provider';

describe('SMTP transport over a local test socket', () => {
  it('sends the actual message through nodemailer and reports accepted delivery', async () => {
    const sockets = new Set<Socket>();
    const messages: string[] = [];
    const server = createServer(socket => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
      socket.setEncoding('utf8');
      socket.write('220 localhost synthetic audit SMTP\r\n');
      let buffer = '';
      let dataMode = false;
      socket.on('data', chunk => {
        buffer += chunk;
        while (buffer.includes('\r\n')) {
          const end = buffer.indexOf('\r\n');
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (dataMode) {
            if (line === '.') { dataMode = false; socket.write('250 accepted\r\n'); }
            else messages.push(line);
          } else if (line.startsWith('EHLO')) socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
          else if (line.startsWith('AUTH')) socket.write('235 authenticated\r\n');
          else if (line === 'DATA') { dataMode = true; socket.write('354 send data\r\n'); }
          else if (line === 'QUIT') socket.end('221 bye\r\n');
          else socket.write('250 OK\r\n');
        }
      });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const provider = new SmtpEmailProvider(new ConfigService({
        SMTP_HOST: '127.0.0.1', SMTP_PORT: (server.address() as AddressInfo).port,
        SMTP_SECURE: false, SMTP_USER: 'audit', SMTP_PASS: 'synthetic-test-only',
      }));
      const result = await provider.sendEmail({
        to: 'receiver@example.invalid', subject: 'ICD transport acceptance',
        text: 'Synthetic delivery body',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();
      expect(messages.join('\n')).toContain('Subject: ICD transport acceptance');
      expect(messages.join('\n')).toContain('Synthetic delivery body');
      expect(messages.join('\n')).toContain('receiver@example.invalid');
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
