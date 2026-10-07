import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma.module';
import { ReportsController } from './reports.controller';
import { ContainerTurnoverReportService } from './services/container-turnover-report.service';
import { EdiHealthReportService } from './services/edi-health-report.service';
import { FinancialReportService } from './services/financial-report.service';
import { GateActivityReportService } from './services/gate-activity-report.service';
import { ReportExportService } from './services/report-export.service';
import { ReportSummaryService } from './services/report-summary.service';
import { ReportTimeService } from './services/report-time.service';
import { YardInventoryReportService } from './services/yard-inventory-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportTimeService,
    GateActivityReportService,
    ContainerTurnoverReportService,
    YardInventoryReportService,
    FinancialReportService,
    EdiHealthReportService,
    ReportSummaryService,
    ReportExportService,
  ],
  exports: [
    ReportTimeService,
    GateActivityReportService,
    ContainerTurnoverReportService,
    YardInventoryReportService,
    FinancialReportService,
    EdiHealthReportService,
    ReportSummaryService,
    ReportExportService,
  ],
})
export class ReportsModule {}
