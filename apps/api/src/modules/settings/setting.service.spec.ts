import { SettingService } from './setting.service';

describe('SettingService', () => {
  it('lists settings scoped to ICD and updates one setting', async () => {
    const prisma = {
      icdSetting: {
        findMany: jest.fn().mockResolvedValue([
          {
            key: 'billing.currency',
            value: 'VND',
            valueType: 'STRING',
          },
        ]),
        upsert: jest.fn().mockResolvedValue({
          key: 'billing.currency',
          value: 'USD',
          valueType: 'STRING',
          updatedAt: new Date('2026-09-21T10:00:00.000Z'),
        }),
      },
    };

    const service = new SettingService(prisma as never);

    await expect(service.findMany('icd-1')).resolves.toEqual({
      data: [
        {
          key: 'billing.currency',
          value: 'VND',
          valueType: 'STRING',
        },
      ],
    });

    await expect(
      service.update('icd-1', 'billing.currency', 'USD', 'user-1'),
    ).resolves.toMatchObject({
      key: 'billing.currency',
      value: 'USD',
      valueType: 'STRING',
    });

    expect(prisma.icdSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          icdId_key: {
            icdId: 'icd-1',
            key: 'billing.currency',
          },
        },
      }),
    );
  });
});
