import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SettingService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(icdId: string) {
    const data = await this.prisma.icdSetting.findMany({
      where: { icdId },
      orderBy: { key: 'asc' },
      select: { key: true, value: true, valueType: true },
    });

    return { data };
  }

  async update(icdId: string, key: string, value: string, updatedBy: string) {
    return this.prisma.icdSetting.upsert({
      where: { icdId_key: { icdId, key } },
      create: {
        icdId,
        key,
        value,
        valueType: 'STRING',
        updatedBy,
      },
      update: { value, updatedBy },
      select: { key: true, value: true, valueType: true, updatedAt: true },
    });
  }
}
