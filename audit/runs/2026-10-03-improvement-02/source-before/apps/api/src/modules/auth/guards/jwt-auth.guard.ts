import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../../common/constants/auth-metadata.constants';

import type { AuthenticatedRequest } from '../../../common/types/authenticated-user.types';

import { AuthService } from '../auth.service';

import { AUTH_ERROR_CODES } from '../constants/auth-error-codes.constants';

import { TokenService } from '../services/token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    private readonly tokenService: TokenService,

    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_MISSING,

        message: 'Access token là bắt buộc.',
      });
    }

    const payload = await this.tokenService.verifyAccessToken(token);

    request.user = await this.authService.getAuthenticatedUser(payload.sub, payload.sid);

    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;

    if (typeof authorization !== 'string') {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
