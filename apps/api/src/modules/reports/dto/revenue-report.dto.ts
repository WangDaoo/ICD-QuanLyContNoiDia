import { IsIn, IsOptional } from 'class-validator';

import { REPORT_GROUP_BY, type ReportGroupBy } from '../constants/report.constants';
import { ReportRangeDto } from './report-range.dto';

export class RevenueReportDto extends ReportRangeDto {
  @IsOptional()
  @IsIn(Object.values(REPORT_GROUP_BY))
  groupBy: ReportGroupBy = REPORT_GROUP_BY.DAY;
}
