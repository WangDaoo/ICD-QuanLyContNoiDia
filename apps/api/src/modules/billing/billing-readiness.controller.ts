import { Controller, Get, Param } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { BillingReadinessService } from './services/billing-readiness.service';

@Controller('billing/readiness')
export class BillingReadinessController {
  constructor(
    private readonly readinessService: BillingReadinessService,
  ) {}

  @Permissions(PERMISSION_CODES.BILLING_READ)
  @Get(':containerVisitId')
  async checkReadiness(
    @Param('containerVisitId') containerVisitId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.readinessService.checkReadiness(
      containerVisitId,
      actor,
    );
    return { data };
  }
}
