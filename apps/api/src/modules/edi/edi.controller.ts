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
import { UpdateEdiRouteDto } from './dto/update-edi-route.dto';
import { QueryEdiOutboxDto } from './dto/query-edi-outbox.dto';

@Controller('edi')
export class EdiController {
  constructor(
    private readonly routeService: EdiRouteService,
    private readonly outboxService: EdiOutboxService,
    private readonly dispatcherService: EdiDispatcherService,
  ) {}

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
}
