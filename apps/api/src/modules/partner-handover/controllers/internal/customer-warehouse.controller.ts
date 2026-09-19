import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PERMISSION_CODES } from '../../../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.types';
import { CreateCustomerWarehouseDto } from '../../dto/create-customer-warehouse.dto';
import { QueryCustomerWarehouseDto } from '../../dto/query-customer-warehouse.dto';
import { UpdateCustomerWarehouseDto } from '../../dto/update-customer-warehouse.dto';
import { CustomerWarehouseService } from '../../services/customer-warehouse.service';

@Controller('customer-warehouses')
export class CustomerWarehouseController {
  constructor(
    private readonly warehouseService: CustomerWarehouseService,
  ) {}

  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  @Post()
  async create(
    @Body() dto: CreateCustomerWarehouseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.warehouseService.create(dto, actor.icdId);
    return {
      data,
      message: 'Tạo thông tin kho khách hàng thành công.',
    };
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_READ)
  @Get()
  async findMany(
    @Query() query: QueryCustomerWarehouseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.warehouseService.findMany(actor.icdId, query);
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_READ)
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.warehouseService.findById(id, actor.icdId);
    return { data };
  }

  @Permissions(PERMISSION_CODES.MASTER_DATA_MANAGE)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerWarehouseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.warehouseService.update(id, dto, actor.icdId);
    return {
      data,
      message: 'Cập nhật kho khách hàng thành công.',
    };
  }
}
