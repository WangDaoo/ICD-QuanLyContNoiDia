import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from '../interfaces/email-provider.interface';

@Injectable()
export class SmtpEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: Transporter | null = null;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultFrom =
      this.configService.get<string>('SMTP_FROM') || 'ICD Notification <noreply@icd.local>';

    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const port = this.configService.get<number>('SMTP_PORT') || 587;
    const secure = this.configService.get<boolean>('SMTP_SECURE') || false;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`SMTP Email Provider initialized with host ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP credentials not fully provided. SmtpEmailProvider running in mock/dry-run mode.',
      );
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      if (!this.transporter) {
        this.logger.log(
          `[MOCK_SMTP] Sending email to: ${options.to}, Subject: ${options.subject}`,
        );
        return {
          success: true,
          messageId: `mock-email-${Date.now()}`,
        };
      }

      const info = await this.transporter.sendMail({
        from: this.defaultFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send email to ${options.to}: ${errMsg}`, stack);
      return {
        success: false,
        error: errMsg || 'Unknown SMTP error',
      };
    }
  }
}
