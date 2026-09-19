import { IsISO8601 } from 'class-validator';

export class IssueInvoiceDto {
  @IsISO8601()
  dueAt!: string;
}
