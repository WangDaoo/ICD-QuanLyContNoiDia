import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PERMISSION_CODES } from '../../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import { CreateMasterDataDto } from '../dto/create-master-data.dto';
import { UpdateMasterDataDto } from '../dto/update-master-data.dto';

type MasterDataType = 'shipping-lines' | 'consignees' | 'clearing-agents' | 'transporters';

@Controller('admin/master-data')
export class MasterDataController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions(PERMISSION_CODES.MASTER_DATA_READ)
  async findAll() {
    const [shippingLines, consignees, clearingAgents, transporters] = await Promise.all([
      this.prisma.shippingLine.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.consignee.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.clearingAgent.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.transporter.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return {
      shippingLines,
      consignees,
      clearingAgents,
      transporters,
    };
  }

  @Post(':type')
  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  create(
    @Param('type') type: string,
    @Body() dto: CreateMasterDataDto,
    @CurrentUser() _actor: AuthenticatedUser,
  ) {
    return this.runForType(type, (masterType) => {
      switch (masterType) {
        case 'shipping-lines':
          return this.prisma.shippingLine.create({
            data: {
              name: dto.name,
              scacCode: this.required(dto.scacCode, 'scacCode'),
              active: dto.active ?? true,
            },
          });
        case 'consignees':
          return this.prisma.consignee.create({
            data: {
              name: dto.name,
              taxCode: this.required(dto.taxCode, 'taxCode'),
              phone: dto.phone,
              email: dto.email,
              address: dto.address,
              active: dto.active ?? true,
            },
          });
        case 'clearing-agents':
          return this.prisma.clearingAgent.create({
            data: {
              name: dto.name,
              licenseNo: this.required(dto.licenseNo, 'licenseNo'),
              active: dto.active ?? true,
            },
          });
        case 'transporters':
          return this.prisma.transporter.create({
            data: {
              name: dto.name,
              taxCode: this.required(dto.taxCode, 'taxCode'),
              active: dto.active ?? true,
            },
          });
      }
    });
  }

  @Patch(':type/:id')
  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  update(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: UpdateMasterDataDto,
    @CurrentUser() _actor: AuthenticatedUser,
  ) {
    return this.runForType(type, (masterType) => {
      switch (masterType) {
        case 'shipping-lines':
          return this.prisma.shippingLine.update({
            where: { id },
            data: {
              ...(dto.name !== undefined && { name: dto.name }),
              ...(dto.scacCode !== undefined && { scacCode: dto.scacCode }),
              ...(dto.active !== undefined && { active: dto.active }),
            },
          });
        case 'consignees':
          return this.prisma.consignee.update({
            where: { id },
            data: {
              ...(dto.name !== undefined && { name: dto.name }),
              ...(dto.taxCode !== undefined && { taxCode: dto.taxCode }),
              ...(dto.phone !== undefined && { phone: dto.phone }),
              ...(dto.email !== undefined && { email: dto.email }),
              ...(dto.address !== undefined && { address: dto.address }),
              ...(dto.active !== undefined && { active: dto.active }),
            },
          });
        case 'clearing-agents':
          return this.prisma.clearingAgent.update({
            where: { id },
            data: {
              ...(dto.name !== undefined && { name: dto.name }),
              ...(dto.licenseNo !== undefined && { licenseNo: dto.licenseNo }),
              ...(dto.active !== undefined && { active: dto.active }),
            },
          });
        case 'transporters':
          return this.prisma.transporter.update({
            where: { id },
            data: {
              ...(dto.name !== undefined && { name: dto.name }),
              ...(dto.taxCode !== undefined && { taxCode: dto.taxCode }),
              ...(dto.active !== undefined && { active: dto.active }),
            },
          });
      }
    });
  }

  private runForType<T>(type: string, action: (masterType: MasterDataType) => T): T {
    if (
      type !== 'shipping-lines' &&
      type !== 'consignees' &&
      type !== 'clearing-agents' &&
      type !== 'transporters'
    ) {
      throw new BadRequestException({
        code: 'MASTER_DATA_TYPE_UNSUPPORTED',
        message: `Loại master data không được hỗ trợ: ${type}.`,
      });
    }

    return action(type);
  }

  private required(value: string | undefined, field: string): string {
    if (!value?.trim()) {
      throw new BadRequestException({
        code: 'MASTER_DATA_FIELD_REQUIRED',
        message: `${field} là bắt buộc.`,
      });
    }
    return value.trim();
  }
}
