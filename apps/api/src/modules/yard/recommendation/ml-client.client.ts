import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MlCandidateInput {
  yardSlotId: string;
  slotCode: string | null;
  blockCode: string;
  rowNo: string;
  bayNo: string;
  tierNo: string;
  reeferPower: boolean;
  maxWeight: number | null;
  ruleScore: number;
  ruleRank: number;
}

export interface MlRerankInput {
  containerVisitId: string;
  containerNumber: string;
  containerType: string;
  category: string;
  grossWeight: number | null;
  dwellDays: number;
  candidates: MlCandidateInput[];
}

export interface MlCandidateOutput {
  yardSlotId: string;
  mlProbability: number;
  mlRank: number;
}

export interface MlRerankOutput {
  modelVersion: string;
  candidates: MlCandidateOutput[];
}

@Injectable()
export class MlClient {
  private readonly logger = new Logger(MlClient.name);

  constructor(private readonly configService: ConfigService) {}

  get isEnabled(): boolean {
    const raw = this.configService.get<string>('ML_RECOMMENDATION_ENABLED') ?? 'true';
    return raw === 'true' || raw === '1';
  }

  get serviceUrl(): string {
    return (
      this.configService.get<string>('ML_SERVICE_URL') ??
      process.env.ML_SERVICE_URL ??
      'http://localhost:8000'
    );
  }

  get timeoutMs(): number {
    const val = this.configService.get<string>('ML_RECOMMENDATION_TIMEOUT_MS');
    return val ? parseInt(val, 10) : 2000;
  }

  async rerankCandidates(input: MlRerankInput): Promise<MlRerankOutput | null> {
    if (!this.isEnabled) {
      return null;
    }

    if (!input.candidates || input.candidates.length === 0) {
      return null;
    }

    const endpoint = `${this.serviceUrl.replace(/\/+$/, '')}/recommendations/rerank`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `ML recommendation service returned HTTP status ${response.status} for visit ${input.containerVisitId}`,
        );
        return null;
      }

      const body = (await response.json()) as Partial<MlRerankOutput>;

      if (!body || typeof body.modelVersion !== 'string' || !Array.isArray(body.candidates)) {
        this.logger.warn(
          `ML recommendation service returned malformed response for visit ${input.containerVisitId}`,
        );
        return null;
      }

      // Security rule: ML must never introduce candidates not present in input
      const allowedSlotIds = new Set(input.candidates.map((c) => c.yardSlotId));
      const validCandidates: MlCandidateOutput[] = [];

      for (const item of body.candidates) {
        if (
          item &&
          typeof item.yardSlotId === 'string' &&
          allowedSlotIds.has(item.yardSlotId) &&
          typeof item.mlProbability === 'number' &&
          typeof item.mlRank === 'number'
        ) {
          validCandidates.push({
            yardSlotId: item.yardSlotId,
            mlProbability: item.mlProbability,
            mlRank: item.mlRank,
          });
        }
      }

      if (validCandidates.length === 0) {
        this.logger.warn(`ML response contained 0 valid candidate slots from sent candidates.`);
        return null;
      }

      return {
        modelVersion: body.modelVersion,
        candidates: validCandidates,
      };
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        this.logger.warn(
          `ML recommendation service call timed out after ${this.timeoutMs}ms for visit ${input.containerVisitId}`,
        );
      } else {
        this.logger.warn(
          `Failed to call ML recommendation service for visit ${input.containerVisitId}: ${err.message}`,
        );
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
