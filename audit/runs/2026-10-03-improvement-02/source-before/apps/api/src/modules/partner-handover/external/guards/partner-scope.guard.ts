import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PartnerApiScope } from '../constants/partner-api.constants';
import { PARTNER_SCOPES_KEY } from '../decorators/partner-scopes.decorator';
import type { PartnerApiRequest } from '../types/partner-api.types';

@Injectable()
export class PartnerScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<PartnerApiScope[]>(
        PARTNER_SCOPES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PartnerApiRequest>();
    const principal = request.partner;

    if (!principal) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Partner principal not found.',
      });
    }

    const available = new Set(principal.scopes);

    const allowed = required.every((scope) => available.has(scope));

    if (!allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_SCOPE',
        message: 'Partner API scope is not sufficient.',
      });
    }

    return true;
  }
}
