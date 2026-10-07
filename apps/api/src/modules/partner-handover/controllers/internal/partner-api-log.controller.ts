import { Controller, Get, Param, Query } from '@nestjs/common';
import { PERMISSION_CODES } from '../../../../common/constants/permission-codes.constants';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import { QueryPartnerApiLogsDto } from '../../dto/query-partner-api-logs.dto';
import { PartnerApiLogService } from '../../services/partner-api-log.service';

@Controller('admin/partner-api-logs')
export class PartnerApiLogController {
  constructor(private readonly partnerApiLogService: PartnerApiLogService) {}

  @Get()
  @Permissions(PERMISSION_CODES.PARTNER_API_LOG_READ)
  findMany(@Query() query: QueryPartnerApiLogsDto) {
    return this.partnerApiLogService.findMany(query);
  }

  @Get(':id')
  @Permissions(PERMISSION_CODES.PARTNER_API_LOG_READ)
  findById(@Param('id') id: string) {
    return this.partnerApiLogService.findById(id);
  }
}
