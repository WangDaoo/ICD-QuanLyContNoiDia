import { Body, Controller, Post } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { ConfirmGateOutDto } from './dto/confirm-gate-out.dto';
import { GateOutService } from './services/gate-out.service';

@Controller('gate-out')
export class GateOutController {
  constructor(private readonly gateOutService: GateOutService) {}

  @Permissions(PERMISSION_CODES.GATE_PASS_USE)
  @Post()
  async confirmGateOut(
    @Body() dto: ConfirmGateOutDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.gateOutService.confirmGateOut(dto, actor);
    return { data };
  }
}
