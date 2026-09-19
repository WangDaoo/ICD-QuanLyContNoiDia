import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { EdiRouteService } from './services/edi-route.service';
import { EdiOutboxService } from './services/edi-outbox.service';
import { EdiDispatcherService } from './services/edi-dispatcher.service';
import { EdiAckService } from './services/edi-ack.service';
import { EdiAlertService } from './services/edi-alert.service';
import { UpdateEdiRouteDto } from './dto/update-edi-route.dto';
import { QueryEdiOutboxDto } from './dto/query-edi-outbox.dto';
import { IngestEdiAckDto } from './dto/ingest-edi-ack.dto';
import { QueryEdiAckDto } from './dto/query-edi-ack.dto';
import { QueryEdiAlertDto } from './dto/query-edi-alert.dto';
import { ResolveEdiAlertDto } from './dto/resolve-edi-alert.dto';

@Controller('edi')
export class EdiController {
  constructor(
    private readonly routeService: EdiRouteService,
    private readonly outboxService: EdiOutboxService,
    private readonly dispatcherService: EdiDispatcherService,
    private readonly ackService: EdiAckService,
    private readonly alertService: EdiAlertService,
  ) {}

  // ==========================================
  // EDI ROUTES
  // ==========================================

  @Get('routes')
  @Permissions(PERMISSION_CODES.EDI_READ)
  async getRoutes(@CurrentUser() actor: AuthenticatedUser) {
    const data = await this.routeService.getRoutes(actor);
    return { data };
  }

  @Put('routes/:shippingLineId')
  @Permissions(PERMISSION_CODES.EDI_MANAGE)
  async updateRoute(
    @Param('shippingLineId') shippingLineId: string,
    @Body() dto: UpdateEdiRouteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.routeService.updateRoute(shippingLineId, dto, actor);
    return { data };
  }

  // ==========================================
  // EDI OUTBOX
  // ==========================================

  @Get('outbox')
  @Permissions(PERMISSION_CODES.EDI_READ)
  async listOutbox(
    @Query() query: QueryEdiOutboxDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.outboxService.listOutbox(actor, query);
    return { data };
  }

  @Get('outbox/:id')
  @Permissions(PERMISSION_CODES.EDI_READ)
  async getOutboxById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.outboxService.getOutboxById(id, actor);
    return { data };
  }

  @Post('outbox/:id/retry')
  @Permissions(PERMISSION_CODES.EDI_MANAGE)
  async retryOutbox(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.outboxService.retryOutbox(id, actor);
    return { data };
  }

  @Post('dispatch')
  @Permissions(PERMISSION_CODES.EDI_DISPATCH)
  async triggerDispatch() {
    const data = await this.dispatcherService.triggerManualDispatch();
    return { data };
  }

  // ==========================================
  // EDI ACKNOWLEDGEMENTS (CONTRL / APERAK)
  // ==========================================

  @Post('acks/ingest')
  @Permissions(PERMISSION_CODES.EDI_ACK_INGEST)
  async ingestAck(
    @Body() dto: IngestEdiAckDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.ackService.ingestAck(dto, actor);
    return { data };
  }

  @Get('acks')
  @Permissions(PERMISSION_CODES.EDI_READ)
  async listAcks(
    @Query() query: QueryEdiAckDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.ackService.listAcks(actor, query);
    return { data };
  }

  @Get('acks/:id')
  @Permissions(PERMISSION_CODES.EDI_READ)
  async getAckById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.ackService.getAckById(id, actor);
    return { data };
  }

  // ==========================================
  // EDI OPERATIONAL ALERTS / INCIDENTS
  // ==========================================

  @Get('alerts')
  @Permissions(PERMISSION_CODES.EDI_READ)
  async listAlerts(
    @Query() query: QueryEdiAlertDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.alertService.listAlerts(actor, query);
    return { data };
  }

  @Get('alerts/:id')
  @Permissions(PERMISSION_CODES.EDI_READ)
  async getAlertById(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.alertService.getAlertById(id, actor);
    return { data };
  }

  @Post('alerts/:id/acknowledge')
  @Permissions(PERMISSION_CODES.EDI_ALERT_MANAGE)
  async acknowledgeAlert(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.alertService.acknowledgeAlert(id, actor);
    return { data };
  }

  @Post('alerts/:id/resolve')
  @Permissions(PERMISSION_CODES.EDI_ALERT_MANAGE)
  async resolveAlert(
    @Param('id') id: string,
    @Body() dto: ResolveEdiAlertDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.alertService.resolveAlert(id, dto, actor);
    return { data };
  }

  @Post('alerts/sync')
  @Permissions(PERMISSION_CODES.EDI_ALERT_MANAGE)
  async syncAlerts(@CurrentUser() actor: AuthenticatedUser) {
    const data = await this.alertService.syncAlerts(actor);
    return { data };
  }
}

