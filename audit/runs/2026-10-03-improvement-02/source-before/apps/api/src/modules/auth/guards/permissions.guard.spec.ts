import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY } from '../../../common/constants/auth-metadata.constants';

function guardFor(roleCodes: string[], permissionCodes = ['container.read']) {
  const reflector = { getAllAndOverride: jest.fn((key: string) => key === IS_PUBLIC_KEY ? false : key === REQUIRED_PERMISSIONS_KEY ? ['container.read'] : undefined) };
  const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({user: {roleCodes, permissionCodes}}) }) } as unknown as ExecutionContext;
  return { guard: new PermissionsGuard(reflector as unknown as Reflector), context };
}
describe('customer scope safeguard', () => {
  it.each(['CONSIGNEE', 'AGENT'])('does not expose all ICD containers to an unbound %s account', role => {
    const {guard,context} = guardFor([role]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    try { guard.canActivate(context); } catch (error) {
      expect((error as ForbiddenException).getResponse()).toMatchObject({code:'CUSTOMER_SCOPE_NOT_CONFIGURED'});
    }
  });
  it('keeps internal staff access permission-controlled', () => {
    const allowed = guardFor(['GATE_STAFF']);
    expect(allowed.guard.canActivate(allowed.context)).toBe(true);
    const denied = guardFor(['GATE_STAFF'], []);
    expect(() => denied.guard.canActivate(denied.context)).toThrow(ForbiddenException);
  });
});
