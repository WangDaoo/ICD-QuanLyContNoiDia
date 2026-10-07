import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { PERMISSION_CODES } from '../../../common/constants/permission-codes.constants';

import { Permissions } from '../../../common/decorators/permissions.decorator';

import { CreateClearingAgentDto } from '../dto/clearing-agent/create-clearing-agent.dto';

import { UpdateClearingAgentDto } from '../dto/clearing-agent/update-clearing-agent.dto';

import { QueryMasterDataDto } from '../dto/query-master-data.dto';

import { ClearingAgentService } from '../services/clearing-agent.service';

@Controller('admin/master-data/clearing-agents')
export class ClearingAgentsController {
  constructor(private readonly service: ClearingAgentService) {}

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
    dto: CreateClearingAgentDto,
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
    dto: UpdateClearingAgentDto,
  ) {
    return {
      data: await this.service.update(id, dto),
    };
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return {
      data: await this.service.activate(id),
    };
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return {
      data: await this.service.deactivate(id),
    };
  }
}
