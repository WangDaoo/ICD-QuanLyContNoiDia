import { TransporterService } from './transporter.service';

describe('TransporterService active actions', () => {
  it('activates transporter through explicit action', async () => {
    const prisma = {
      transporter: {
        findUnique: jest.fn().mockResolvedValue({ id: 'transporter-1' }),
        update: jest.fn().mockResolvedValue({
          id: 'transporter-1',
          active: true,
        }),
      },
    };
    const service = new TransporterService(prisma as never);

    await expect(service.activate('transporter-1')).resolves.toEqual({
      id: 'transporter-1',
      active: true,
    });
    expect(prisma.transporter.update).toHaveBeenCalledWith({
      where: { id: 'transporter-1' },
      data: { active: true },
    });
  });

  it('deactivates transporter through explicit action', async () => {
    const prisma = {
      transporter: {
        findUnique: jest.fn().mockResolvedValue({ id: 'transporter-1' }),
        update: jest.fn().mockResolvedValue({
          id: 'transporter-1',
          active: false,
        }),
      },
    };
    const service = new TransporterService(prisma as never);

    await expect(service.deactivate('transporter-1')).resolves.toEqual({
      id: 'transporter-1',
      active: false,
    });
    expect(prisma.transporter.update).toHaveBeenCalledWith({
      where: { id: 'transporter-1' },
      data: { active: false },
    });
  });
});
