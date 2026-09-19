import {
  Body,
  Controller,
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

import { CreateManifestDto } from '../dto/manifest/create-manifest.dto';

import { QueryManifestsDto } from '../dto/manifest/query-manifests.dto';

import { UpdateManifestDto } from '../dto/manifest/update-manifest.dto';

import { ManifestService } from '../services/manifest.service';

@Controller('manifests')
export class ManifestsController {
  constructor(private readonly manifestService: ManifestService) {}

  @Get()
  @Permissions(PERMISSION_CODES.MANIFEST_READ)
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryManifestsDto) {
    return this.manifestService.list(user.icdId, query);
  }

  @Get(':manifestId')
  @Permissions(PERMISSION_CODES.MANIFEST_READ)
  async getDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
  ) {
    return this.manifestService.getDetail(user.icdId, manifestId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSION_CODES.MANIFEST_CREATE)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateManifestDto) {
    return this.manifestService.create(user.icdId, user.id, dto);
  }

  @Patch(':manifestId')
  @Permissions(PERMISSION_CODES.MANIFEST_UPDATE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
    @Body() dto: UpdateManifestDto,
  ) {
    return this.manifestService.update(user.icdId, manifestId, dto);
  }

  @Post(':manifestId/submit')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.MANIFEST_SUBMIT)
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
  ) {
    return this.manifestService.submit(user.icdId, manifestId);
  }

  @Post(':manifestId/cancel')
  @HttpCode(HttpStatus.OK)
  @Permissions(PERMISSION_CODES.MANIFEST_CANCEL)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('manifestId', new ParseUUIDPipe()) manifestId: string,
  ) {
    return this.manifestService.cancel(user.icdId, manifestId);
  }
}
