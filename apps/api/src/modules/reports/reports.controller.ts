import {
  Controller,
  Get,
  Header,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { ExportReportsDto } from './dto/export-reports.dto';
import { ReportRangeDto } from './dto/report-range.dto';
import { RevenueReportDto } from './dto/revenue-report.dto';
import { YardInventoryEodDto } from './dto/yard-inventory-eod.dto';
import { ContainerTurnoverReportService } from './services/container-turnover-report.service';
import { FinancialReportService } from './services/financial-report.service';
import { GateActivityReportService } from './services/gate-activity-report.service';
import { ReportExportService } from './services/report-export.service';
import { ReportSummaryService } from './services/report-summary.service';
import { YardInventoryReportService } from './services/yard-inventory-report.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportSummary: ReportSummaryService,
    private readonly gateActivityReport: GateActivityReportService,
    private readonly containerTurnoverReport: ContainerTurnoverReportService,
    private readonly yardInventoryReport: YardInventoryReportService,
    private readonly financialReport: FinancialReportService,
    private readonly reportExport: ReportExportService,
  ) {}

  @Get('dashboard/summary')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  async getDashboardSummary(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('timeZone') timeZone?: string,
  ) {
    const data = await this.reportSummary.getDashboardSummary(actor.icdId, timeZone);
    return { data };
  }

  @Get('gate-activity')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  async getGateActivity(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ReportRangeDto,
  ) {
    const data = await this.gateActivityReport.getReport(actor.icdId, query);
    return { data };
  }

  @Get('container-turnover')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  async getContainerTurnover(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ReportRangeDto,
  ) {
    const data = await this.containerTurnoverReport.getReport(actor.icdId, query);
    return { data };
  }

  @Get('yard-inventory/current')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  async getCurrentYardInventory(@CurrentUser() actor: AuthenticatedUser) {
    const data = await this.yardInventoryReport.getCurrent(actor.icdId);
    return { data };
  }

  @Get('yard-inventory/eod')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  async getYardInventoryEod(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: YardInventoryEodDto,
  ) {
    const data = await this.yardInventoryReport.getEod(actor.icdId, query);
    return { data };
  }

  @Get('revenue')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  async getRevenue(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: RevenueReportDto,
  ) {
    const data = await this.financialReport.getRevenueReport(actor.icdId, query);
    return { data };
  }

  @Get('outstanding-debt')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  async getOutstandingDebt(@CurrentUser() actor: AuthenticatedUser) {
    const data = await this.financialReport.getOutstandingDebtReport(actor.icdId);
    return { data };
  }

  @Get('export/excel')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportExcel(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ExportReportsDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reportExport.exportToExcel(actor.icdId, query);
    const filename = `icd-report-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
