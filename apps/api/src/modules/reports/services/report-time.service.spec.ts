import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ReportTimeService } from './report-time.service';

describe('ReportTimeService', () => {
  let service: ReportTimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportTimeService],
    }).compile();

    service = module.get<ReportTimeService>(ReportTimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should resolve default time zone', () => {
    expect(service.resolveTimeZone()).toBe('Asia/Ho_Chi_Minh');
  });

  it('should throw error for invalid time zone', () => {
    expect(() => service.resolveTimeZone('Invalid/Zone')).toThrow(
      BadRequestException,
    );
  });

  it('should resolve range correctly and throw if fromDate > toDate', () => {
    const range = service.resolveRange({
      fromDate: '2026-03-01',
      toDate: '2026-03-15',
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    expect(range.fromDate).toBe('2026-03-01');
    expect(range.toDate).toBe('2026-03-15');
    expect(range.fromAt).toBeDefined();
    expect(range.toAtExclusive).toBeDefined();
    expect(range.toAtExclusive.getTime()).toBeGreaterThan(range.fromAt.getTime());

    expect(() =>
      service.resolveRange({
        fromDate: '2026-03-20',
        toDate: '2026-03-10',
      }),
    ).toThrow(BadRequestException);
  });

  it('should resolve today range correctly', () => {
    const fixedNow = new Date('2026-03-19T08:00:00.000Z');
    const today = service.resolveToday('Asia/Ho_Chi_Minh', fixedNow);

    expect(today.date).toBe('2026-03-19');
    expect(today.timeZone).toBe('Asia/Ho_Chi_Minh');
  });

  it('should reject future EOD date', () => {
    const fixedNow = new Date('2026-03-19T08:00:00.000Z');

    expect(() =>
      service.resolveEod('2026-03-25', 'Asia/Ho_Chi_Minh', fixedNow),
    ).toThrow(BadRequestException);
  });
});
