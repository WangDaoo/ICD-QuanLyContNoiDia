export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

export interface IEmailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}
