import { randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { JwtService } from '@nestjs/jwt';

import { AUTH_ERROR_CODES } from '../constants/auth-error-codes.constants';

import type {
  AccessTokenPayload,
  AuthTokenPair,
  RefreshTokenPayload,
} from '../types/auth-token.types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,

    private readonly configService: ConfigService,
  ) {}

  async issueTokenPair(userId: string, email: string, sessionId: string): Promise<AuthTokenPair> {
    const accessTtl = this.configService.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');

    const refreshTtl = this.configService.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS');

    const issuer = this.configService.getOrThrow<string>('JWT_ISSUER');

    const audience = this.configService.getOrThrow<string>('JWT_AUDIENCE');

    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const accessPayload: AccessTokenPayload = {
      sub: userId,

      sid: sessionId,

      type: 'access',

      email,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,

      sid: sessionId,

      /**
       * Mỗi refresh token có JTI riêng.
       *
       * Nhờ vậy token rotate luôn khác token cũ.
       */
      jti: randomUUID(),

      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,

        issuer,

        audience,

        expiresIn: accessTtl,
      }),

      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,

        issuer,

        audience,

        expiresIn: refreshTtl,
      }),
    ]);

    return {
      accessToken,

      refreshToken,

      tokenType: 'Bearer',

      expiresIn: accessTtl,

      refreshExpiresIn: refreshTtl,

      refreshExpiresAt: new Date(Date.now() + refreshTtl * 1000),
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),

        issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),

        audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
      });

      if (payload.type !== 'access' || !payload.sub || !payload.sid) {
        throw new Error('Invalid access token payload.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_INVALID,

        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      });
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),

        issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),

        audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
      });

      if (payload.type !== 'refresh' || !payload.sub || !payload.sid || !payload.jti) {
        throw new Error('Invalid refresh token payload.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_INVALID,

        message: 'Refresh token không hợp lệ hoặc đã hết hạn.',
      });
    }
  }
}
