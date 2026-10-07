import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EdiController } from './edi.controller';
import { EdiConfigService } from './services/edi-config.service';
import { EdiRouteService } from './services/edi-route.service';
import { EdiCodecoSnapshotService } from './services/edi-codeco-snapshot.service';
import { EdiOutboxService } from './services/edi-outbox.service';
import { EdiDispatcherService } from './services/edi-dispatcher.service';
import { EdiCorrelationService } from './services/edi-correlation.service';
import { EdiAlertService } from './services/edi-alert.service';
import { EdiAckService } from './services/edi-ack.service';
import { EdiMockTransport } from './transports/edi-mock.transport';
import { EdiHttpsTransport } from './transports/edi-https.transport';
import { EdiSftpTransport } from './transports/edi-sftp.transport';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuditModule],
  controllers: [EdiController],
  providers: [
    EdiConfigService,
    EdiRouteService,
    EdiCodecoSnapshotService,
    EdiOutboxService,
    EdiDispatcherService,
    EdiCorrelationService,
    EdiAlertService,
    EdiAckService,
    EdiMockTransport,
    EdiHttpsTransport,
    EdiSftpTransport,
  ],
  exports: [
    EdiOutboxService,
    EdiCodecoSnapshotService,
    EdiDispatcherService,
    EdiCorrelationService,
    EdiAlertService,
    EdiAckService,
  ],
})
export class EdiModule {}
