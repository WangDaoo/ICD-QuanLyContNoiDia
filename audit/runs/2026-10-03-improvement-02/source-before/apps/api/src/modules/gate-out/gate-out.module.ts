import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ContainersModule } from '../containers/containers.module';
import { GatePassModule } from '../gate-pass/gate-pass.module';
import { YardModule } from '../yard/yard.module';
import { EdiModule } from '../edi/edi.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GateOutController } from './gate-out.controller';
import { GateOutService } from './services/gate-out.service';

@Module({
  imports: [
    PrismaModule,
    ContainersModule,
    GatePassModule,
    YardModule,
    EdiModule,
    NotificationsModule,
  ],
  controllers: [GateOutController],
  providers: [GateOutService],
  exports: [GateOutService],
})
export class GateOutModule {}

