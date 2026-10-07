import { ContainerVisitStatus } from '../../../generated/prisma/client';
import { ContainerStatePolicy } from './container-state.policy';

describe('ContainerStatePolicy v1.7 contract', () => {
  it('exposes only canonical Container Visit states', () => {
    expect(Object.values(ContainerVisitStatus)).toEqual([
      'PENDING',
      'AUTHORIZED',
      'IN_YARD',
      'GATE_PASS_ISSUED',
      'EXITED',
      'CANCELLED',
    ]);
  });

  it.each([
    [ContainerVisitStatus.PENDING, ContainerVisitStatus.AUTHORIZED],
    [ContainerVisitStatus.AUTHORIZED, ContainerVisitStatus.IN_YARD],
    [ContainerVisitStatus.IN_YARD, ContainerVisitStatus.GATE_PASS_ISSUED],
    [ContainerVisitStatus.GATE_PASS_ISSUED, ContainerVisitStatus.IN_YARD],
    [ContainerVisitStatus.GATE_PASS_ISSUED, ContainerVisitStatus.EXITED],
  ])('allows canonical transition %s -> %s', (currentState, nextState) => {
    expect(ContainerStatePolicy.canTransition(currentState, nextState)).toBe(true);
  });

  it.each([
    [ContainerVisitStatus.PENDING, ContainerVisitStatus.IN_YARD],
    [ContainerVisitStatus.IN_YARD, ContainerVisitStatus.AUTHORIZED],
    [ContainerVisitStatus.EXITED, ContainerVisitStatus.IN_YARD],
  ])('rejects non-canonical transition %s -> %s', (currentState, nextState) => {
    expect(ContainerStatePolicy.canTransition(currentState, nextState)).toBe(false);
  });
});
