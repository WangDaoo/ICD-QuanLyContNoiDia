import { IsOptional, Matches } from 'class-validator';

import { ReportRangeDto } from './report-range.dto';

export class ExportReportsDto extends ReportRangeDto {
  /**
   * Nếu bỏ trống:
   * dùng toDate của report.
   */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  yardEodDate?: string;
}
