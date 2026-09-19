import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions(PERMISSION_CODES.AUDIT_READ)
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: QueryAuditLogDto,
  ) {
    return this.auditService.list(actor.icdId, query);
  }

  @Get('request/:requestId')
  @Permissions(PERMISSION_CODES.AUDIT_READ)
  async findByRequestId(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ) {
    return this.auditService.findByRequestId(actor.icdId, requestId);
  }

  @Get('entity/:entityType/:entityId')
  @Permissions(PERMISSION_CODES.AUDIT_READ)
  async findByEntity(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(actor.icdId, entityType, entityId);
  }
}
