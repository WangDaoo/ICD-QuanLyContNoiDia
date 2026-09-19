import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import { HealthService } from './health.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Overall service health and database connectivity' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service or database is unhealthy' })
  check() {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for orchestrators (Kubernetes/ECS)' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for database connection' })
  @ApiResponse({ status: 200, description: 'Database is reachable and ready' })
  @ApiResponse({ status: 503, description: 'Database connection failed' })
  ready() {
    return this.healthService.ready();
  }
}
