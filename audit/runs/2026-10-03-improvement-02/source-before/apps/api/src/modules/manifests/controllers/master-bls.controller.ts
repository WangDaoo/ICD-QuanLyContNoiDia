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

import { CreateMasterBlDto } from '../dto/master-bl/create-master-bl.dto';

import { QueryMasterBlsDto } from '../dto/master-bl/query-master-bls.dto';

import { UpdateMasterBlDto } from '../dto/master-bl/update-master-bl.dto';

import { MasterBlService } from '../services/master-bl.service';

@Controller('manifests/:manifestId/master-bls')
export class MasterBlsController {
  constructor(private readonly masterBlService: MasterBlService) {}

  @Get()
  @Permissions(PERMISSION_CODES.MANIFEST_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Query() query: QueryMasterBlsDto,
  ) {
    return this.masterBlService.list(user.icdId, manifestId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSION_CODES.MANIFEST_UPDATE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Body() dto: CreateMasterBlDto,
  ) {
    return this.masterBlService.create(user.icdId, manifestId, dto);
  }

  @Patch(':mblId')
  @Permissions(PERMISSION_CODES.MANIFEST_UPDATE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Param('mblId', new ParseUUIDPipe()) mblId: string,
    @Body() dto: UpdateMasterBlDto,
  ) {
    return this.masterBlService.update(user.icdId, manifestId, mblId, dto);
  }

  @Delete(':mblId')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.MANIFEST_UPDATE)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Param('mblId', new ParseUUIDPipe()) mblId: string,
  ) {
    return this.masterBlService.remove(user.icdId, manifestId, mblId);
  }
}
