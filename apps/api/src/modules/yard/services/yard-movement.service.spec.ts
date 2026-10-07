import { YardMovementService } from './yard-movement.service';
import { YardMovementPolicy } from '../policies/yard-movement.policy';
import { YardAssignmentPolicy } from '../policies/yard-assignment.policy';
import type { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import type { YardLocationService } from './yard-location.service';
import type { ContainerEventService } from '../../containers/services/container-event.service';

const actor = {id:'actor',icdId:'icd'} as AuthenticatedUser;
function fixture() {
  const order:string[] = [];
  const movement = {id:'movement',containerVisitId:'visit',fromSlotId:'z-source',toSlotId:'a-target',status:'IN_PROGRESS',containerVisit:{state:'IN_YARD'},toSlot:{operational:true,yardBlock:{operational:true},locationLogs:[]},fromSlot:{}};
  const tx = {
    $queryRaw:jest.fn(async (sql) => {order.push('lock:'+sql.values[0]);return [];}),
    yardMovement:{findFirst:jest.fn(async () => {order.push('read');return movement;}),create:jest.fn(),update:jest.fn(async () => movement)},
    containerVisit:{findFirst:jest.fn()},yardSlot:{findFirst:jest.fn()},
    containerLocationLog:{findFirst:jest.fn(async () => ({yardSlotId:'z-source'})),updateMany:jest.fn(),create:jest.fn(async () => ({id:'location'}))},
  };
  const prisma = {...tx,$transaction:jest.fn(async (fn) => fn(tx))};
  const events = {record:jest.fn()};
  const service = new YardMovementService(prisma as unknown as PrismaService,new YardMovementPolicy(new YardAssignmentPolicy()),{formatSlotCode:()=> 'A-1'} as unknown as YardLocationService,events as unknown as ContainerEventService);
  return {service,tx,prisma,order,movement,events};
}
describe('Yard movement serialization', () => {
  it('locks visit then sorted slots and rereads before completing',async () => {
    const f=fixture();await f.service.completeMovement('movement',actor);
    expect(f.order.slice(0,5)).toEqual(['read','lock:visit','lock:a-target','lock:z-source','read']);
    expect(f.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function),{isolationLevel:'ReadCommitted'});
    expect(f.tx.containerLocationLog.create).toHaveBeenCalledTimes(1);
  });
  it('rejects a target occupied while waiting for its lock without ending the source location',async () => {
    const f=fixture();f.tx.$queryRaw.mockImplementation(async sql => {if(sql.values[0] === 'a-target') (f.movement.toSlot.locationLogs as unknown[]).push({id:'competing'});return [];});
    await expect(f.service.completeMovement('movement',actor)).rejects.toThrow();
    expect(f.tx.containerLocationLog.updateMany).not.toHaveBeenCalled();expect(f.tx.containerLocationLog.create).not.toHaveBeenCalled();
  });
  it('rejects a source changed since the movement request',async () => {
    const f=fixture();f.tx.containerLocationLog.findFirst.mockResolvedValue({yardSlotId:'changed'});
    await expect(f.service.completeMovement('movement',actor)).rejects.toThrow();expect(f.tx.containerLocationLog.create).not.toHaveBeenCalled();
  });
  it('checks active movement after the visit lock before creating another request',async () => {
    const f=fixture();f.tx.containerVisit.findFirst.mockImplementation(async()=> {expect(f.tx.$queryRaw).toHaveBeenCalled();return {id:'visit',state:'IN_YARD',container:{type:'DRY_20'},locationLogs:[{yardSlotId:'source'}],yardMovements:[{id:'existing'}]};});
    f.tx.yardSlot.findFirst.mockResolvedValue({id:'target',operational:true,yardBlock:{operational:true},locationLogs:[]});
    await expect(f.service.requestMovement('visit',{toSlotId:'target'},actor)).rejects.toThrow();expect(f.tx.yardMovement.create).not.toHaveBeenCalled();
  });
  it('does not let a cancellation overwrite a completion observed after the visit lock',async () => {
    const f=fixture();f.tx.$queryRaw.mockImplementation(async()=> {f.movement.status='COMPLETED';return [];});
    await expect(f.service.cancelMovement('movement',{reason:'cancel'},actor)).rejects.toThrow();expect(f.tx.yardMovement.update).not.toHaveBeenCalled();
  });
});
