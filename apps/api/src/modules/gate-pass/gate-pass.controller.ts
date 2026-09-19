import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { CancelGatePassDto } from './dto/cancel-gate-pass.dto';
import { IssueGatePassDto } from './dto/issue-gate-pass.dto';
import { ScanGatePassDto } from './dto/scan-gate-pass.dto';
import { GatePassReadinessService } from './services/gate-pass-readiness.service';
import { GatePassScanService } from './services/gate-pass-scan.service';
import { GatePassService } from './services/gate-pass.service';

@Controller()
export class GatePassController {
  constructor(
    private readonly gatePassService: GatePassService,
    private readonly readinessService: GatePassReadinessService,
    private readonly scanService: GatePassScanService,
  ) {}

  @Permissions(
    PERMISSION_CODES.GATE_PASS_CREATE,
    PERMISSION_CODES.GATE_PASS_USE,
    PERMISSION_CODES.CONTAINER_READ,
  )
  @Get('containers/:visitId/gate-pass/readiness')
  async checkReadiness(@Param('visitId') visitId: string, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.readinessService.evaluateReadiness(visitId, actor, 'ISSUE');
    return { data };
  }

  @Permissions(
    PERMISSION_CODES.GATE_PASS_CREATE,
    PERMISSION_CODES.GATE_PASS_USE,
    PERMISSION_CODES.CONTAINER_READ,
  )
  @Get('containers/:visitId/gate-pass')
  async findActiveGatePass(
    @Param('visitId') visitId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.gatePassService.findActiveByVisitId(visitId, actor.icdId);
    return { data };
  }

  @Permissions(
    PERMISSION_CODES.GATE_PASS_CREATE,
    PERMISSION_CODES.GATE_PASS_USE,
    PERMISSION_CODES.CONTAINER_READ,
  )
  @Get('containers/:visitId/gate-passes')
  async findManyForVisit(
    @Param('visitId') visitId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.gatePassService.findManyForVisit(visitId, actor.icdId);
    return { data };
  }

  @Permissions(PERMISSION_CODES.GATE_PASS_CREATE)
  @Post('containers/:visitId/gate-pass')
  async issue(
    @Param('visitId') visitId: string,
    @Body() dto: IssueGatePassDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.gatePassService.issue(visitId, dto, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.GATE_PASS_CREATE)
  @Post('gate-passes/:gatePassId/cancel')
  async cancel(
    @Param('gatePassId') gatePassId: string,
    @Body() dto: CancelGatePassDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.gatePassService.cancel(gatePassId, dto, actor);
    return { data };
  }

  @Permissions(PERMISSION_CODES.GATE_PASS_USE)
  @Post('gate-pass/scan')
  async scan(@Body() dto: ScanGatePassDto, @CurrentUser() actor: AuthenticatedUser) {
    const data = await this.scanService.scanGatePass(dto.qrToken, actor);
    return { data };
  }
}
