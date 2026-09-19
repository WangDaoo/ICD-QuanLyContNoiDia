import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { AddTariffRuleDto } from './dto/add-tariff-rule.dto';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { QueryTariffsDto } from './dto/query-tariffs.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { TariffService } from './services/tariff.service';

@Controller('billing')
export class TariffController {
  constructor(private readonly tariffService: TariffService) {}

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get('service-types')
  async listServiceTypes() {
    const data = await this.tariffService.listServiceTypes();
    return { data };
  }

  @Permissions(PERMISSION_CODES.TARIFF_MANAGE)
  @Post('tariffs')
  async createTariff(
    @Body() dto: CreateTariffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.tariffService.createTariff(dto, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get('tariffs')
  async findTariffs(
    @Query() query: QueryTariffsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.tariffService.findTariffs(query, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get('tariffs/:id')
  async findTariffById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.tariffService.findTariffById(id, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.TARIFF_MANAGE)
  @Patch('tariffs/:id')
  async updateTariff(
    @Param('id') id: string,
    @Body() dto: UpdateTariffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.tariffService.updateTariff(id, dto, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.TARIFF_MANAGE)
  @Post('tariffs/:id/rules')
  async addTariffRule(
    @Param('id') id: string,
    @Body() dto: AddTariffRuleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.tariffService.addTariffRule(id, dto, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.TARIFF_MANAGE)
  @Delete('tariffs/:id/rules/:ruleId')
  async removeTariffRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.tariffService.removeTariffRule(id, ruleId, actor);
    return { success: true };
  }

  @Permissions(PERMISSION_CODES.TARIFF_MANAGE)
  @Post('tariffs/:id/activate')
  async activateTariff(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.tariffService.activateTariff(id, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.TARIFF_MANAGE)
  @Post('tariffs/:id/retire')
  async retireTariff(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.tariffService.retireTariff(id, actor);
    return { data };
  }
}
