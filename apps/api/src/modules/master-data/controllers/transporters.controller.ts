import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { PERMISSION_CODES } from '../../../common/constants/permission-codes.constants';

import { Permissions } from '../../../common/decorators/permissions.decorator';

import { CreateTransporterDto } from '../dto/transporter/create-transporter.dto';

import { UpdateTransporterDto } from '../dto/transporter/update-transporter.dto';

import { QueryMasterDataDto } from '../dto/query-master-data.dto';

import { UpdateMasterDataStatusDto } from '../dto/update-master-data-status.dto';

import { TransporterService } from '../services/transporter.service';

@Controller('admin/master-data/transporters')
export class TransportersController {
  constructor(private readonly service: TransporterService) {}

  @Permissions(PERMISSION_CODES.MASTER_DATA_READ)
  @Get()
  findMany(
    @Query()
    query: QueryMasterDataDto,
  ) {
    return this.service.findMany(query);
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_READ)
  @Get(':id')
  async findById(
    @Param('id')
    id: string,
  ) {
    return {
      data: await this.service.findById(id),
    };
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  @Post()
  async create(
    @Body()
    dto: CreateTransporterDto,
  ) {
    return {
      data: await this.service.create(dto),
    };
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  @Patch(':id')
  async update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateTransporterDto,
  ) {
    return {
      data: await this.service.update(id, dto),
    };
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  @Patch(':id/status')
  async updateStatus(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateMasterDataStatusDto,
  ) {
    return {
      data: await this.service.updateStatus(id, dto.active),
    };
  }
}
