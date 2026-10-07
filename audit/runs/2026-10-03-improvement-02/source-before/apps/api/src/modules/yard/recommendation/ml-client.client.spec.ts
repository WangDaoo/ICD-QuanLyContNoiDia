import { ConfigService } from '@nestjs/config';
import { MlClient, type MlRerankInput } from './ml-client.client';

describe('MlClient', () => {
  let client: MlClient;
  let mockConfigService: { get: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'ML_RECOMMENDATION_ENABLED') return 'true';
        if (key === 'ML_SERVICE_URL') return 'http://ml-service.local:8000';
        if (key === 'ML_RECOMMENDATION_TIMEOUT_MS') return '500';
        return null;
      }),
    };
    client = new MlClient(mockConfigService as unknown as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const sampleInput: MlRerankInput = {
    containerVisitId: 'visit-1',
    containerNumber: 'EMCU1234567',
    containerType: 'DRY_40',
    category: 'IMPORT',
    grossWeight: 22000,
    dwellDays: 2,
    candidates: [
      {
        yardSlotId: 'slot-1',
        slotCode: 'A-01-01-1',
        blockCode: 'A',
        rowNo: '01',
        bayNo: '01',
        tierNo: '1',
        reeferPower: false,
        maxWeight: 30000,
        ruleScore: 100,
        ruleRank: 1,
      },
      {
        yardSlotId: 'slot-2',
        slotCode: 'A-01-01-2',
        blockCode: 'A',
        rowNo: '01',
        bayNo: '01',
        tierNo: '2',
        reeferPower: false,
        maxWeight: 30000,
        ruleScore: 100,
        ruleRank: 2,
      },
    ],
  };

  it('returns null if ML is disabled', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ML_RECOMMENDATION_ENABLED') return 'false';
      return null;
    });

    const result = await client.rerankCandidates(sampleInput);
    expect(result).toBeNull();
  });

  it('returns null if input candidate list is empty', async () => {
    const result = await client.rerankCandidates({
      ...sampleInput,
      candidates: [],
    });
    expect(result).toBeNull();
  });

  it('calls fetch and returns reranked candidates successfully', async () => {
    const mockResponseData = {
      modelVersion: 'yard-xgb-v1.2.0',
      candidates: [
        { yardSlotId: 'slot-2', mlProbability: 0.89, mlRank: 1 },
        { yardSlotId: 'slot-1', mlProbability: 0.42, mlRank: 2 },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponseData),
    } as unknown as Response);

    const result = await client.rerankCandidates(sampleInput);

    expect(result).not.toBeNull();
    expect(result?.modelVersion).toBe('yard-xgb-v1.2.0');
    expect(result?.candidates).toHaveLength(2);
    expect(result?.candidates[0]!.yardSlotId).toBe('slot-2');
    expect(result?.candidates[0]!.mlRank).toBe(1);
  });

  it('filters out any hallucinated candidate IDs not present in original input', async () => {
    const mockResponseData = {
      modelVersion: 'yard-xgb-v1.2.0',
      candidates: [
        { yardSlotId: 'slot-unknown-rogue', mlProbability: 0.99, mlRank: 1 },
        { yardSlotId: 'slot-1', mlProbability: 0.5, mlRank: 2 },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponseData),
    } as unknown as Response);

    const result = await client.rerankCandidates(sampleInput);

    expect(result).not.toBeNull();
    expect(result?.candidates).toHaveLength(1);
    expect(result?.candidates[0]!.yardSlotId).toBe('slot-1');
  });

  it('returns null when fetch fails with network error or 500 status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const result = await client.rerankCandidates(sampleInput);
    expect(result).toBeNull();
  });
});
