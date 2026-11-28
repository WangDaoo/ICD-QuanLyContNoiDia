import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { RealtimeChangeInterceptor } from './realtime-change.interceptor';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { RealtimeStreamService } from './realtime-stream.service';

/**
 * Kênh realtime: phát sự kiện sau mỗi request ghi thành công và
 * đẩy xuống Web/Mobile qua SSE. @Global để job nền (cron) cũng phát được.
 */
@Global()
@Module({
  controllers: [RealtimeController],
  providers: [
    RealtimeService,
    RealtimeStreamService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RealtimeChangeInterceptor,
    },
  ],
  exports: [RealtimeService],
})
export class RealtimeModule {}
