import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  PERMISSION_CODES,
} from '../../../common/constants/permission-codes.constants';

import {
  Permissions,
} from '../../../common/decorators/permissions.decorator';

import {
  CreateConsigneeDto,
} from '../dto/consignee/create-consignee.dto';

import {
  UpdateConsigneeDto,
} from '../dto/consignee/update-consignee.dto';

import {
  QueryMasterDataDto,
} from '../dto/query-master-data.dto';

import {
  UpdateMasterDataStatusDto,
} from '../dto/update-master-data-status.dto';

import {
  ConsigneeService,
} from '../services/consignee.service';

@Controller(
  'admin/master-data/consignees',
)
export class ConsigneesController {
  constructor(
    private readonly service:
      ConsigneeService,
  ) {}

  @Permissions(
    PERMISSION_CODES
      .MASTER_DATA_READ,
  )
  @Get()
  findMany(
    @Query()
    query: QueryMasterDataDto,
  ) {
    return this.service
      .findMany(query);
  }

  @Permissions(
    PERMISSION_CODES
      .MASTER_DATA_READ,
  )
  @Get(':id')
  async findById(
    @Param('id')
    id: string,
  ) {
    return {
      data:
        await this.service
          .findById(id),
    };
  }

  @Permissions(
    PERMISSION_CODES
      .MASTER_DATA_MANAGE,
  )
  @Post()
  async create(
    @Body()
    dto:
      CreateConsigneeDto,
  ) {
    return {
      data:
        await this.service
          .create(dto),
    };
  }

  @Permissions(
    PERMISSION_CODES
      .MASTER_DATA_MANAGE,
  )
  @Patch(':id')
  async update(
    @Param('id')
    id: string,

    @Body()
    dto:
      UpdateConsigneeDto,
  ) {
    return {
      data:
        await this.service
          .update(
            id,
            dto,
          ),
    };
  }

  @Permissions(
    PERMISSION_CODES
      .MASTER_DATA_MANAGE,
  )
  @Patch(':id/status')
  async updateStatus(
    @Param('id')
    id: string,

    @Body()
    dto:
      UpdateMasterDataStatusDto,
  ) {
    return {
      data:
        await this.service
          .updateStatus(
            id,
            dto.active,
          ),
    };
  }
}
