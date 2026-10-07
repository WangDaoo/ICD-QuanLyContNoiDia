import { BadRequestException, Injectable } from '@nestjs/common';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import { DEFAULT_REPORT_TIME_ZONE } from '../constants/report.constants';
import type { ReportRangeDto } from '../dto/report-range.dto';

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);

  const value = new Date(Date.UTC(year!, month! - 1, day! + days));

  return value.toISOString().slice(0, 10);
}

@Injectable()
export class ReportTimeService {
  resolveTimeZone(timeZone?: string): string {
    const value = timeZone ?? DEFAULT_REPORT_TIME_ZONE;

    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: value,
      }).format(new Date());
    } catch {
      throw new BadRequestException({
        code: 'REPORT_TIME_ZONE_INVALID',
        message: 'Múi giờ báo cáo không hợp lệ.',
      });
    }

    return value;
  }

  getLocalDate(value: Date, timeZone: string): string {
    return formatInTimeZone(value, timeZone, 'yyyy-MM-dd');
  }

  resolveRange(query: ReportRangeDto, now = new Date()) {
    const timeZone = this.resolveTimeZone(query.timeZone);
    const today = this.getLocalDate(now, timeZone);

    /**
     * Default report = tháng hiện tại.
     */
    const defaultFromDate = `${today.slice(0, 7)}-01`;
    const fromDate = query.fromDate ?? defaultFromDate;
    const toDate = query.toDate ?? today;

    if (fromDate > toDate) {
      throw new BadRequestException({
        code: 'REPORT_DATE_RANGE_INVALID',
        message: 'fromDate phải nhỏ hơn hoặc bằng toDate.',
      });
    }

    const fromAt = fromZonedTime(`${fromDate}T00:00:00.000`, timeZone);
    const toDateExclusive = addCalendarDays(toDate, 1);
    const toAtExclusive = fromZonedTime(`${toDateExclusive}T00:00:00.000`, timeZone);

    return {
      timeZone,
      fromDate,
      toDate,
      fromAt,
      toAtExclusive,
    };
  }

  resolveToday(timeZoneInput?: string, now = new Date()) {
    const timeZone = this.resolveTimeZone(timeZoneInput);
    const date = this.getLocalDate(now, timeZone);

    return {
      timeZone,
      date,
      fromAt: fromZonedTime(`${date}T00:00:00.000`, timeZone),
      toAtExclusive: fromZonedTime(`${addCalendarDays(date, 1)}T00:00:00.000`, timeZone),
    };
  }

  resolveEod(date: string, timeZoneInput?: string, now = new Date()) {
    const timeZone = this.resolveTimeZone(timeZoneInput);
    const today = this.getLocalDate(now, timeZone);

    if (date > today) {
      throw new BadRequestException({
        code: 'REPORT_EOD_FUTURE_DATE',
        message: 'Không thể tạo Yard Inventory EOD cho ngày trong tương lai.',
      });
    }

    /**
     * Ngày hôm nay = as-of-now.
     *
     * Ngày quá khứ = cuối ngày
     * tức ngay trước 00:00 ngày tiếp theo.
     */
    const asOfAt =
      date === today
        ? now
        : new Date(fromZonedTime(`${addCalendarDays(date, 1)}T00:00:00.000`, timeZone).getTime() - 1);

    return {
      date,
      timeZone,
      asOfAt,
      isFinalized: date < today,
    };
  }

  bucketDate(date: Date, timeZone: string): string {
    return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
  }

  bucketHour(date: Date, timeZone: string): number {
    return Number(formatInTimeZone(date, timeZone, 'HH'));
  }
}
