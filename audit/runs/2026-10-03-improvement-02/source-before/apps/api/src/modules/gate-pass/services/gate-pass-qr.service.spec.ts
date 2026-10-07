import { GatePassService } from './gate-pass.service';
import { GatePassStatus } from '../../../generated/prisma/client';

describe('Gate pass QR retrieval', () => {
  const expiresAt = new Date(Date.now()+60000);
  const prisma = {gatePass:{findFirst:jest.fn()}};
  const tokens = {create:jest.fn().mockReturnValue('signed-qr'),hash:jest.fn().mockReturnValue('hash')};
  const service = new GatePassService(prisma as any,{} as any,{} as any,{} as any,tokens as any);
  it('recreates the original signed QR only within the actor ICD', async () => {
    prisma.gatePass.findFirst.mockResolvedValue({id:'pass',expiresAt,qrTokenHash:'hash',status:GatePassStatus.ACTIVE});
    expect(await service.getQrToken('pass','site')).toEqual({qrToken:'signed-qr'});
    expect(prisma.gatePass.findFirst).toHaveBeenCalledWith({where:{id:'pass',containerVisit:{icdId:'site'}}});
  });
  it('refuses missing, used and expired passes', async () => {
    for(const pass of [null,{id:'pass',status:GatePassStatus.USED,expiresAt},{id:'pass',status:GatePassStatus.ACTIVE,expiresAt:new Date(0)}]) {
      prisma.gatePass.findFirst.mockResolvedValue(pass);
      await expect(service.getQrToken('pass','site')).rejects.toThrow();
    }
  });
});
