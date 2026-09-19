import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  EDI_DEFAULT_CONFIG,
  EDI_SETTING_KEYS,
  EdiDispatcherConfig,
} from '../constants/edi-settings.constants';

@Injectable()
export class EdiConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(icdId?: string): Promise<EdiDispatcherConfig> {
    const settings = await this.prisma.icdSetting.findMany({
      where: {
        ...(icdId ? { icdId } : {}),
        key: {
          in: Object.values(EDI_SETTING_KEYS),
        },
      },
    });

    const map = new Map<string, string>();
    for (const s of settings) {
      map.set(s.key, s.value);
    }

    const parseNumber = (key: string, defaultValue: number): number => {
      const val = map.get(key);
      if (!val) return defaultValue;
      const parsed = Number(val);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
    };

    return {
      maxRetries: parseNumber(
        EDI_SETTING_KEYS.EDI_MAX_RETRIES,
        EDI_DEFAULT_CONFIG.maxRetries,
      ),
      baseBackoffSeconds: parseNumber(
        EDI_SETTING_KEYS.EDI_BASE_BACKOFF_SECONDS,
        EDI_DEFAULT_CONFIG.baseBackoffSeconds,
      ),
      maxBackoffSeconds: parseNumber(
        EDI_SETTING_KEYS.EDI_MAX_BACKOFF_SECONDS,
        EDI_DEFAULT_CONFIG.maxBackoffSeconds,
      ),
      batchSize: parseNumber(
        EDI_SETTING_KEYS.EDI_DISPATCH_BATCH_SIZE,
        EDI_DEFAULT_CONFIG.batchSize,
      ),
      processingStaleSeconds: parseNumber(
        EDI_SETTING_KEYS.EDI_PROCESSING_STALE_SECONDS,
        EDI_DEFAULT_CONFIG.processingStaleSeconds,
      ),
    };
  }
}
