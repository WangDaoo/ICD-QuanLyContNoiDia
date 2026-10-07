import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../../common/constants/auth-metadata.constants';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { GateOutController } from '../gate-out/gate-out.controller';
import { GatePassController } from './gate-pass.controller';

function contextFor(handler: Function, controller: Function, roleCodes: string[], permissionCodes: string[]) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { roleCodes, permissionCodes } }) }),
  } as unknown as ExecutionContext;
}

describe('Gate-pass endpoint permissions', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);
  const reads = ['checkReadiness', 'findActiveGatePass', 'findManyForVisit'] as const;

  it.each(reads)('%s permits internal container lookup without granting gate-pass creation', (method) => {
    const handler = GatePassController.prototype[method];
    expect(reflector.get(REQUIRED_PERMISSIONS_KEY, handler)).toEqual([PERMISSION_CODES.CONTAINER_READ]);
    expect(guard.canActivate(contextFor(handler, GatePassController, ['GATE_STAFF'], [PERMISSION_CODES.CONTAINER_READ]))).toBe(true);
    expect(() => guard.canActivate(contextFor(handler, GatePassController, ['GATE_STAFF'], []))).toThrow(ForbiddenException);
  });

  it.each(reads)('%s keeps an unbound external account out of ICD-wide gate-pass details', (method) => {
    const handler = GatePassController.prototype[method];
    expect(() => guard.canActivate(contextFor(handler, GatePassController, ['CONSIGNEE'], [PERMISSION_CODES.CONTAINER_READ]))).toThrow(ForbiddenException);
  });

  it.each([
    ['issue', PERMISSION_CODES.GATE_PASS_CREATE],
    ['getQr', PERMISSION_CODES.GATE_PASS_CREATE],
    ['cancel', PERMISSION_CODES.GATE_PASS_CREATE],
    ['scan', PERMISSION_CODES.GATE_PASS_USE],
  ] as const)('%s still requires %s', (method, permission) => {
    const handler = GatePassController.prototype[method];
    expect(reflector.get(REQUIRED_PERMISSIONS_KEY, handler)).toEqual([permission]);
    expect(() => guard.canActivate(contextFor(handler, GatePassController, ['GATE_STAFF'], [PERMISSION_CODES.CONTAINER_READ]))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor(handler, GatePassController, ['GATE_STAFF'], [permission]))).toBe(true);
  });

  it('keeps the final gate-out command gated by gate_pass.use', () => {
    const handler = GateOutController.prototype.confirmGateOut;
    expect(reflector.get(REQUIRED_PERMISSIONS_KEY, handler)).toEqual([PERMISSION_CODES.GATE_PASS_USE]);
    expect(() => guard.canActivate(contextFor(handler, GateOutController, ['YARD_STAFF'], [PERMISSION_CODES.CONTAINER_READ]))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor(handler, GateOutController, ['GATE_STAFF'], [PERMISSION_CODES.GATE_PASS_USE]))).toBe(true);
  });
});
