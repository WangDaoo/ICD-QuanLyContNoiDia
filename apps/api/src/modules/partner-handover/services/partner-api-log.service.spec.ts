import { PartnerApiLogService } from './partner-api-log.service';

describe('PartnerApiLogService', () => {
  it('filters logs by HTTP status and returns one redacted log detail', async () => {
    const prisma = {
      partnerApiLog: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'log-1', httpStatus: 200 }]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'log-1',
          requestBodyRedacted: {},
          responseBodyRedacted: {},
        }),
      },
    };

    const service = new PartnerApiLogService(prisma as never);

    await expect(service.findMany({ statusCode: 200 })).resolves.toMatchObject({
      data: [{ id: 'log-1', httpStatus: 200 }],
      meta: { total: 1 },
    });
    await expect(service.findById('log-1')).resolves.toMatchObject({
      id: 'log-1',
      requestBodyRedacted: {},
      responseBodyRedacted: {},
    });

    expect(prisma.partnerApiLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { httpStatus: 200 },
      }),
    );
  });
});
