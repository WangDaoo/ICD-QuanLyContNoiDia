import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PartnerApiAuthService } from '../services/partner-api-auth.service';
import type { PartnerApiRequest } from '../types/partner-api.types';
import { PartnerApiKeyGuard } from './partner-api-key.guard';
import { PartnerScopeGuard } from './partner-scope.guard';

describe('Partner Guards', () => {
  describe('PartnerApiKeyGuard', () => {
    let guard: PartnerApiKeyGuard;
    let authService: {
      authenticate: jest.Mock;
    };

    beforeEach(() => {
      authService = {
        authenticate: jest.fn(),
      };
      guard = new PartnerApiKeyGuard(authService as unknown as PartnerApiAuthService);
    });

    it('extracts x-api-key and sets request.partner', async () => {
      const mockPrincipal = {
        clientId: 'client-1',
        partnerCode: 'PARTNER-01',
        partnerName: 'Test Partner',
        scopes: ['handover.read'],
      };
      authService.authenticate.mockResolvedValue(mockPrincipal);

      const request: Partial<PartnerApiRequest> = {
        headers: {
          'x-api-key': 'pk_live_1234567890',
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(authService.authenticate).toHaveBeenCalledWith('pk_live_1234567890');
      expect(request.partner).toEqual(mockPrincipal);
    });
  });

  describe('PartnerScopeGuard', () => {
    let guard: PartnerScopeGuard;
    let reflector: {
      getAllAndOverride: jest.Mock;
    };

    beforeEach(() => {
      reflector = {
        getAllAndOverride: jest.fn(),
      };
      guard = new PartnerScopeGuard(reflector as unknown as Reflector);
    });

    it('returns true if no scopes required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws UnauthorizedException if principal is missing on scoped route', () => {
      reflector.getAllAndOverride.mockReturnValue(['handover.read']);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ partner: undefined }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException if principal lacks required scope', () => {
      reflector.getAllAndOverride.mockReturnValue(['handover.accept']);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            partner: {
              clientId: 'c1',
              partnerCode: 'P1',
              partnerName: 'Partner',
              scopes: ['handover.read'],
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('returns true if principal has all required scopes', () => {
      reflector.getAllAndOverride.mockReturnValue(['handover.read', 'handover.accept']);

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            partner: {
              clientId: 'c1',
              partnerCode: 'P1',
              partnerName: 'Partner',
              scopes: ['handover.read', 'handover.accept', 'handover.transit'],
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
