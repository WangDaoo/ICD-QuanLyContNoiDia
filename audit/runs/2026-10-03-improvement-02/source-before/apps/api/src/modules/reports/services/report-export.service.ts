import { Injectable } from '@nestjs/common';
import { Workbook, type Worksheet } from 'exceljs';

import { REPORT_EXCEL_SHEETS, REPORT_GROUP_BY } from '../constants/report.constants';
import type { ExportReportsDto } from '../dto/export-reports.dto';
import { ContainerTurnoverReportService } from './container-turnover-report.service';
import { FinancialReportService } from './financial-report.service';
import { GateActivityReportService } from './gate-activity-report.service';
import { ReportSummaryService } from './report-summary.service';
import { ReportTimeService } from './report-time.service';
import { YardInventoryReportService } from './yard-inventory-report.service';

@Injectable()
export class ReportExportService {
  constructor(
    private readonly reportTime: ReportTimeService,
    private readonly reportSummary: ReportSummaryService,
    private readonly gateActivityReport: GateActivityReportService,
    private readonly containerTurnoverReport: ContainerTurnoverReportService,
    private readonly yardInventoryReport: YardInventoryReportService,
    private readonly financialReport: FinancialReportService,
  ) {}

  async exportToExcel(icdId: string, query: ExportReportsDto): Promise<Buffer> {
    const range = this.reportTime.resolveRange(query);
    const timeZone = range.timeZone;
    const eodDate = query.yardEodDate ?? range.toDate;

    // Fetch data for all sheets in parallel
    const [summary, gateActivity, turnover, yardCurrent, yardEod, revenue, debt] =
      await Promise.all([
        this.reportSummary.getDashboardSummary(icdId, timeZone),
        this.gateActivityReport.getReport(icdId, {
          fromDate: range.fromDate,
          toDate: range.toDate,
          timeZone,
        }),
        this.containerTurnoverReport.getReport(icdId, {
          fromDate: range.fromDate,
          toDate: range.toDate,
          timeZone,
        }),
        this.yardInventoryReport.getCurrent(icdId),
        this.yardInventoryReport.getEod(icdId, {
          date: eodDate,
          timeZone,
        }),
        this.financialReport.getRevenueReport(icdId, {
          fromDate: range.fromDate,
          toDate: range.toDate,
          timeZone,
          groupBy: REPORT_GROUP_BY.DAY,
        }),
        this.financialReport.getOutstandingDebtReport(icdId),
      ]);

    const workbook = new Workbook();
    workbook.creator = 'ICD Management System';
    workbook.created = new Date();

    const applyHeaderStyle = (worksheet: Worksheet) => {
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 24;
    };

    // 1. Summary Sheet
    const summarySheet = workbook.addWorksheet(REPORT_EXCEL_SHEETS.SUMMARY);
    summarySheet.columns = [
      { header: 'Chỉ số (KPI / Metric)', key: 'metric', width: 35 },
      { header: 'Giá trị (Value)', key: 'value', width: 25 },
    ];
    applyHeaderStyle(summarySheet);
    summarySheet.addRows([
      { metric: 'Khoảng thời gian báo cáo', value: `${range.fromDate} -> ${range.toDate}` },
      { metric: 'Múi giờ', value: timeZone },
      { metric: 'Tổng số Container trong Bãi', value: summary.yard.inYardCount },
      { metric: 'Tổng Gate In hôm nay', value: summary.gateToday.gateIn },
      { metric: 'Tổng Gate Out hôm nay', value: summary.gateToday.gateOut },
      { metric: 'Net Flow hôm nay', value: summary.gateToday.netFlow },
      { metric: 'Doanh thu tháng (VND)', value: summary.revenueMonth.totalRevenue },
      { metric: 'Số giao dịch thanh toán', value: summary.revenueMonth.allocationCount },
      { metric: 'Tổng công nợ chưa thu (VND)', value: summary.outstandingDebt.totalOutstanding },
      { metric: 'Công nợ quá hạn (VND)', value: summary.outstandingDebt.totalOverdue },
      { metric: 'Số hóa đơn còn nợ', value: summary.outstandingDebt.invoiceCount },
      { metric: 'Cảnh báo lưu bãi (Free-day)', value: summary.freeDayWarnings.totalWarnings },
      { metric: 'Active Operational Holds', value: summary.operationalHolds.activeCount },
      { metric: 'Active EDI Alerts', value: summary.ediAlerts.activeAlertsCount },
    ]);

    // 2. Gate Activity Sheet
    const gateSheet = workbook.addWorksheet(REPORT_EXCEL_SHEETS.GATE_ACTIVITY);
    gateSheet.columns = [
      { header: 'Ngày (Date)', key: 'date', width: 18 },
      { header: 'Gate In', key: 'gateIn', width: 14 },
      { header: 'Gate Out', key: 'gateOut', width: 14 },
      { header: 'Net Flow', key: 'netFlow', width: 14 },
    ];
    applyHeaderStyle(gateSheet);
    for (const row of gateActivity.daily) {
      gateSheet.addRow({
        date: row.date,
        gateIn: row.gateIn,
        gateOut: row.gateOut,
        netFlow: row.gateIn - row.gateOut,
      });
    }

    // 3. Container Turnover Sheet
    const turnoverSheet = workbook.addWorksheet(REPORT_EXCEL_SHEETS.CONTAINER_TURNOVER);
    turnoverSheet.columns = [
      { header: 'Số Container', key: 'containerNumber', width: 18 },
      { header: 'Loại Cont', key: 'containerType', width: 14 },
      { header: 'Chủ hàng (Consignee)', key: 'consignee', width: 28 },
      { header: 'Thời điểm Gate In', key: 'gateInAt', width: 22 },
      { header: 'Thời điểm Gate Out', key: 'gateOutAt', width: 22 },
      { header: 'Thời gian lưu (Giờ)', key: 'dwellHours', width: 20 },
      { header: 'Thời gian lưu (Ngày)', key: 'dwellDays', width: 20 },
    ];
    applyHeaderStyle(turnoverSheet);
    for (const row of turnover.data) {
      turnoverSheet.addRow({
        containerNumber: row.containerNumber,
        containerType: row.containerType,
        consignee: row.consignee?.name ?? '-',
        gateInAt: row.gateInAt ? new Date(row.gateInAt).toISOString() : '',
        gateOutAt: row.gateOutAt ? new Date(row.gateOutAt).toISOString() : '',
        dwellHours: row.dwellHours,
        dwellDays: row.dwellDays,
      });
    }

    // 4. Current Yard Inventory Sheet
    const yardSheet = workbook.addWorksheet(REPORT_EXCEL_SHEETS.YARD_INVENTORY);
    yardSheet.columns = [
      { header: 'Số Container', key: 'containerNumber', width: 18 },
      { header: 'Loại Cont', key: 'containerType', width: 14 },
      { header: 'Trạng thái', key: 'state', width: 18 },
      { header: 'Block', key: 'blockCode', width: 12 },
      { header: 'Vị trí (Slot Code)', key: 'slotCode', width: 18 },
      { header: 'Row', key: 'rowNo', width: 10 },
      { header: 'Bay', key: 'bayNo', width: 10 },
      { header: 'Tier', key: 'tierNo', width: 10 },
      { header: 'Chủ hàng', key: 'consignee', width: 28 },
      { header: 'Vào vị trí lúc', key: 'startedAt', width: 22 },
    ];
    applyHeaderStyle(yardSheet);
    for (const row of yardCurrent.data) {
      yardSheet.addRow({
        containerNumber: row.containerNumber,
        containerType: row.containerType,
        state: row.state,
        blockCode: row.blockCode,
        slotCode: row.slotCode,
        rowNo: row.rowNo,
        bayNo: row.bayNo,
        tierNo: row.tierNo,
        consignee: row.consignee?.name ?? '-',
        startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : '',
      });
    }

    // 5. Yard EOD Sheet
    const eodSheet = workbook.addWorksheet(REPORT_EXCEL_SHEETS.YARD_EOD);
    eodSheet.columns = [
      { header: 'Ngày chốt EOD', key: 'date', width: 16 },
      { header: 'Số Container', key: 'containerNumber', width: 18 },
      { header: 'Loại Cont', key: 'containerType', width: 14 },
      { header: 'Block', key: 'blockCode', width: 12 },
      { header: 'Vị trí (Slot Code)', key: 'slotCode', width: 18 },
      { header: 'Bắt đầu ở vị trí', key: 'startedAt', width: 22 },
      { header: 'Rời vị trí lúc', key: 'endedAt', width: 22 },
    ];
    applyHeaderStyle(eodSheet);
    for (const row of yardEod.data) {
      eodSheet.addRow({
        date: yardEod.date,
        containerNumber: row.containerNumber,
        containerType: row.containerType,
        blockCode: row.blockCode,
        slotCode: row.slotCode,
        startedAt: row.locationStartedAt ? new Date(row.locationStartedAt).toISOString() : '',
        endedAt: row.locationEndedAt ? new Date(row.locationEndedAt).toISOString() : 'Đang ở bãi',
      });
    }

    // 6. Revenue Sheet
    const revenueSheet = workbook.addWorksheet(REPORT_EXCEL_SHEETS.REVENUE);
    revenueSheet.columns = [
      { header: 'Kỳ / Ngày', key: 'bucket', width: 16 },
      { header: 'Doanh thu (VND)', key: 'amount', width: 22 },
    ];
    applyHeaderStyle(revenueSheet);
    for (const row of revenue.series) {
      revenueSheet.addRow({
        bucket: row.bucket,
        amount: row.amount,
      });
    }

    // 7. Outstanding Debt Sheet
    const debtSheet = workbook.addWorksheet(REPORT_EXCEL_SHEETS.OUTSTANDING_DEBT);
    debtSheet.columns = [
      { header: 'Số Hóa đơn', key: 'invoiceNo', width: 20 },
      { header: 'Chủ hàng (Consignee)', key: 'consignee', width: 28 },
      { header: 'Ngày phát hành', key: 'issuedAt', width: 20 },
      { header: 'Hạn thanh toán', key: 'dueAt', width: 20 },
      { header: 'Tổng tiền (VND)', key: 'totalAmount', width: 20 },
      { header: 'Đã thanh toán (VND)', key: 'paidAmount', width: 20 },
      { header: 'Còn nợ (VND)', key: 'outstandingAmount', width: 20 },
      { header: 'Quá hạn', key: 'isOverdue', width: 14 },
      { header: 'Số ngày quá hạn', key: 'daysOverdue', width: 16 },
    ];
    applyHeaderStyle(debtSheet);
    for (const row of debt.data) {
      debtSheet.addRow({
        invoiceNo: row.invoiceNo,
        consignee: row.consignee.name,
        issuedAt: row.issuedAt ? new Date(row.issuedAt).toISOString() : '',
        dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : '',
        totalAmount: row.totalAmount,
        paidAmount: row.paidAmount,
        outstandingAmount: row.outstandingAmount,
        isOverdue: row.isOverdue ? 'CÓ' : 'KHÔNG',
        daysOverdue: row.daysOverdue,
      });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
