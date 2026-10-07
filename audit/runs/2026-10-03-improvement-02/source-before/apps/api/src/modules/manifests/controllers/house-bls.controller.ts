import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { PERMISSION_CODES } from '../../../common/constants/permission-codes.constants';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { Permissions } from '../../../common/decorators/permissions.decorator';

import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';

import { CreateHouseBlDto } from '../dto/house-bl/create-house-bl.dto';

import { QueryHouseBlsDto } from '../dto/house-bl/query-house-bls.dto';

import { UpdateHouseBlDto } from '../dto/house-bl/update-house-bl.dto';

import { HouseBlService } from '../services/house-bl.service';

@Controller('manifests/:manifestId/master-bls/:mblId/house-bls')
export class HouseBlsController {
  constructor(private readonly houseBlService: HouseBlService) {}

  @Get()
  @Permissions(PERMISSION_CODES.MANIFEST_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Param('mblId', new ParseUUIDPipe()) mblId: string,
    @Query() query: QueryHouseBlsDto,
  ) {
    return this.houseBlService.list(user.icdId, manifestId, mblId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSION_CODES.MANIFEST_UPDATE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Param('mblId', new ParseUUIDPipe()) mblId: string,
    @Body() dto: CreateHouseBlDto,
  ) {
    return this.houseBlService.create(user.icdId, manifestId, mblId, dto);
  }

  @Patch(':hblId')
  @Permissions(PERMISSION_CODES.MANIFEST_UPDATE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Param('mblId', new ParseUUIDPipe()) mblId: string,
    @Param('hblId', new ParseUUIDPipe()) hblId: string,
    @Body() dto: UpdateHouseBlDto,
  ) {
    return this.houseBlService.update(user.icdId, manifestId, mblId, hblId, dto);
  }

  @Delete(':hblId')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.MANIFEST_UPDATE)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Param('mblId', new ParseUUIDPipe()) mblId: string,
    @Param('hblId', new ParseUUIDPipe()) hblId: string,
  ) {
    return this.houseBlService.remove(user.icdId, manifestId, mblId, hblId);
  }
}
