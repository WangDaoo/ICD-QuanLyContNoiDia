import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Public } from '../../../../common/decorators/public.decorator';
import { PARTNER_API_SCOPES } from '../constants/partner-api.constants';
import { PartnerPrincipal } from '../decorators/partner-principal.decorator';
import { PartnerScopes } from '../decorators/partner-scopes.decorator';
import { AcceptHandoverDto } from '../dto/accept-handover.dto';
import { DeliveryFailedDto } from '../dto/delivery-failed.dto';
import { ExternalHandoverQueryDto } from '../dto/external-handover-query.dto';
import { MarkInTransitDto } from '../dto/mark-in-transit.dto';
import { RejectHandoverDto } from '../dto/reject-handover.dto';
import { WarehouseReceivedDto } from '../dto/warehouse-received.dto';
import { PartnerExternalExceptionFilter } from '../filters/partner-external-exception.filter';
import { PartnerApiKeyGuard } from '../guards/partner-api-key.guard';
import { PartnerScopeGuard } from '../guards/partner-scope.guard';
import { PartnerReadLogInterceptor } from '../interceptors/partner-read-log.interceptor';
import { ExternalHandoverCommandService } from '../services/external-handover-command.service';
import { ExternalHandoverQueryService } from '../services/external-handover-query.service';
import { PartnerApiCommandExecutorService } from '../services/partner-api-command-executor.service';
import type {
  PartnerApiPrincipal as Principal,
  PartnerApiRequest,
} from '../types/partner-api.types';

@Controller('v1/external/handovers')
@Public()
@UseGuards(PartnerApiKeyGuard, PartnerScopeGuard)
@UseFilters(PartnerExternalExceptionFilter)
@UseInterceptors(PartnerReadLogInterceptor)
export class ExternalHandoversController {
  constructor(
    private readonly queryService: ExternalHandoverQueryService,
    private readonly commandService: ExternalHandoverCommandService,
    private readonly commandExecutor: PartnerApiCommandExecutorService,
  ) {}

  @Get()
  @PartnerScopes(PARTNER_API_SCOPES.HANDOVER_READ)
  async list(
    @Query() query: ExternalHandoverQueryDto,
    @PartnerPrincipal() principal: Principal,
  ) {
    return this.queryService.findMany(query, principal);
  }

  @Get(':handoverId')
  @PartnerScopes(PARTNER_API_SCOPES.HANDOVER_READ)
  async getDetail(
    @Param('handoverId') handoverId: string,
    @PartnerPrincipal() principal: Principal,
  ) {
    return this.queryService.getByIdOrThrow(handoverId, principal);
  }

  @Post(':handoverId/accept')
  @PartnerScopes(PARTNER_API_SCOPES.HANDOVER_ACCEPT)
  async accept(
    @Param('handoverId') handoverId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: AcceptHandoverDto,
    @PartnerPrincipal() principal: Principal,
    @Req() req: PartnerApiRequest,
  ) {
    const requestId =
      req.requestId ??
      (typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : 'unknown');

    return this.commandExecutor.execute({
      principal,
      endpoint: req.originalUrl ?? req.url,
      method: 'POST',
      idempotencyKey,
      body: dto,
      requestId,
      command: (tx) =>
        this.commandService.accept(tx, handoverId, principal, dto, requestId),
    });
  }

  @Post(':handoverId/reject')
  @PartnerScopes(PARTNER_API_SCOPES.HANDOVER_ACCEPT)
  async reject(
    @Param('handoverId') handoverId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: RejectHandoverDto,
    @PartnerPrincipal() principal: Principal,
    @Req() req: PartnerApiRequest,
  ) {
    const requestId =
      req.requestId ??
      (typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : 'unknown');

    return this.commandExecutor.execute({
      principal,
      endpoint: req.originalUrl ?? req.url,
      method: 'POST',
      idempotencyKey,
      body: dto,
      requestId,
      command: (tx) =>
        this.commandService.reject(tx, handoverId, principal, dto, requestId),
    });
  }

  @Post(':handoverId/in-transit')
  @PartnerScopes(PARTNER_API_SCOPES.HANDOVER_TRANSIT)
  async markInTransit(
    @Param('handoverId') handoverId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: MarkInTransitDto,
    @PartnerPrincipal() principal: Principal,
    @Req() req: PartnerApiRequest,
  ) {
    const requestId =
      req.requestId ??
      (typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : 'unknown');

    return this.commandExecutor.execute({
      principal,
      endpoint: req.originalUrl ?? req.url,
      method: 'POST',
      idempotencyKey,
      body: dto,
      requestId,
      command: (tx) =>
        this.commandService.markInTransit(
          tx,
          handoverId,
          principal,
          dto,
          requestId,
        ),
    });
  }

  @Post(':handoverId/delivery-failed')
  @PartnerScopes(PARTNER_API_SCOPES.HANDOVER_FAILURE)
  async deliveryFailed(
    @Param('handoverId') handoverId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: DeliveryFailedDto,
    @PartnerPrincipal() principal: Principal,
    @Req() req: PartnerApiRequest,
  ) {
    const requestId =
      req.requestId ??
      (typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : 'unknown');

    return this.commandExecutor.execute({
      principal,
      endpoint: req.originalUrl ?? req.url,
      method: 'POST',
      idempotencyKey,
      body: dto,
      requestId,
      command: (tx) =>
        this.commandService.deliveryFailed(
          tx,
          handoverId,
          principal,
          dto,
          requestId,
        ),
    });
  }

  @Post(':handoverId/warehouse-received')
  @PartnerScopes(PARTNER_API_SCOPES.HANDOVER_CONFIRM_WAREHOUSE)
  async warehouseReceived(
    @Param('handoverId') handoverId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: WarehouseReceivedDto,
    @PartnerPrincipal() principal: Principal,
    @Req() req: PartnerApiRequest,
  ) {
    const requestId =
      req.requestId ??
      (typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : 'unknown');

    return this.commandExecutor.execute({
      principal,
      endpoint: req.originalUrl ?? req.url,
      method: 'POST',
      idempotencyKey,
      body: dto,
      requestId,
      command: (tx) =>
        this.commandService.warehouseReceived(
          tx,
          handoverId,
          principal,
          dto,
          requestId,
        ),
    });
  }
}

