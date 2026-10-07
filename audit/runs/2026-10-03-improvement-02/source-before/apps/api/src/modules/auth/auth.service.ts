import { randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';

import { PrismaService } from '../../database/prisma.service';

import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';

import { hashToken, tokenHashesEqual } from '../../common/security/token-hash.util';

import { verifyPassword } from '../../common/security/password.util';

import { AUTH_ERROR_CODES } from './constants/auth-error-codes.constants';

import type { LoginDto } from './dto/login.dto';

import type { RefreshTokenDto } from './dto/refresh-token.dto';

import { TokenService } from './services/token.service';

import type { AuthResult } from './types/auth-token.types';

const USER_IDENTITY_SELECT = {
  id: true,

  icdId: true,

  name: true,

  email: true,

  active: true,

  icd: {
    select: {
      active: true,
    },
  },

  roles: {
    select: {
      role: {
        select: {
          code: true,

          active: true,

          permissions: {
            select: {
              permission: {
                select: {
                  code: true,

                  active: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

const USER_LOGIN_SELECT = {
  ...USER_IDENTITY_SELECT,

  passwordHash: true,
} satisfies Prisma.UserSelect;

type UserIdentityRecord = Prisma.UserGetPayload<{
  select: typeof USER_IDENTITY_SELECT;
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },

      select: USER_LOGIN_SELECT,
    });

    /**
     * Không cho attacker biết:
     *
     * - email không tồn tại
     * - password sai
     *
     * Cả hai cùng trả một lỗi.
     */
    if (!user) {
      throw this.invalidCredentials();
    }

    if (!user.active || !user.icd.active) {
      throw this.invalidCredentials();
    }

    const passwordValid = await verifyPassword(user.passwordHash, dto.password);

    if (!passwordValid) {
      throw this.invalidCredentials();
    }

    const sessionId = randomUUID();

    const tokens = await this.tokenService.issueTokenPair(user.id, user.email, sessionId);

    await this.prisma.authSession.create({
      data: {
        id: sessionId,

        userId: user.id,

        refreshTokenHash: hashToken(tokens.refreshToken),

        expiresAt: tokens.refreshExpiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,

      refreshToken: tokens.refreshToken,

      tokenType: tokens.tokenType,

      expiresIn: tokens.expiresIn,

      refreshExpiresIn: tokens.refreshExpiresIn,

      user: this.mapAuthenticatedUser(user, sessionId),
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResult> {
    const payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);

    const session = await this.prisma.authSession.findUnique({
      where: {
        id: payload.sid,
      },

      select: {
        id: true,

        userId: true,

        refreshTokenHash: true,

        expiresAt: true,

        revokedAt: true,

        user: {
          select: USER_IDENTITY_SELECT,
        },
      },
    });

    const now = new Date();

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= now ||
      !session.user.active ||
      !session.user.icd.active
    ) {
      throw this.invalidSession();
    }

    const providedHash = hashToken(dto.refreshToken);

    /**
     * Token cũ bị reuse sau rotation:
     *
     * revoke toàn session.
     */
    if (!tokenHashesEqual(session.refreshTokenHash, providedHash)) {
      await this.revokeSession(session.id, session.userId);

      throw this.invalidSession();
    }

    const newTokens = await this.tokenService.issueTokenPair(
      session.user.id,
      session.user.email,
      session.id,
    );

    const newRefreshHash = hashToken(newTokens.refreshToken);

    /**
     * updateMany + old hash tạo atomic compare-and-swap.
     *
     * Nếu hai refresh request dùng cùng token cũ,
     * chỉ một request được phép rotate thành công.
     */
    const updateResult = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,

        userId: session.userId,

        refreshTokenHash: providedHash,

        revokedAt: null,

        expiresAt: {
          gt: now,
        },
      },

      data: {
        refreshTokenHash: newRefreshHash,

        expiresAt: newTokens.refreshExpiresAt,

        lastUsedAt: now,
      },
    });

    if (updateResult.count !== 1) {
      await this.revokeSession(session.id, session.userId);

      throw this.invalidSession();
    }

    return {
      accessToken: newTokens.accessToken,

      refreshToken: newTokens.refreshToken,

      tokenType: newTokens.tokenType,

      expiresIn: newTokens.expiresIn,

      refreshExpiresIn: newTokens.refreshExpiresIn,

      user: this.mapAuthenticatedUser(session.user, session.id),
    };
  }

  /**
   * Logout current session.
   *
   * Idempotent:
   * gọi lần hai vẫn không gây lỗi.
   */
  async logout(user: AuthenticatedUser): Promise<{
    success: true;
  }> {
    await this.revokeSession(user.sessionId, user.id);

    return {
      success: true,
    };
  }

  /**
   * Được JwtAuthGuard gọi cho mỗi protected request.
   *
   * Kiểm tra:
   * - session tồn tại
   * - session chưa revoke
   * - session chưa expire
   * - user active
   * - ICD Site active
   *
   * Role/Permission được lấy lại từ DB,
   * không tin dữ liệu role trong JWT.
   */
  async getAuthenticatedUser(userId: string, sessionId: string): Promise<AuthenticatedUser> {
    const session = await this.prisma.authSession.findUnique({
      where: {
        id: sessionId,
      },

      select: {
        userId: true,

        revokedAt: true,

        expiresAt: true,

        user: {
          select: USER_IDENTITY_SELECT,
        },
      },
    });

    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active ||
      !session.user.icd.active
    ) {
      throw this.invalidSession();
    }

    return this.mapAuthenticatedUser(session.user, sessionId);
  }

  private mapAuthenticatedUser(user: UserIdentityRecord, sessionId: string): AuthenticatedUser {
    const activeRoles = user.roles.map(({ role }) => role).filter((role) => role.active);

    const roleCodes = activeRoles.map((role) => role.code);

    const permissionCodes = [
      ...new Set(
        activeRoles.flatMap((role) =>
          role.permissions
            .filter(({ permission }) => permission.active)
            .map(({ permission }) => permission.code),
        ),
      ),
    ];

    return {
      id: user.id,

      icdId: user.icdId,

      sessionId,

      name: user.name,

      email: user.email,

      roleCodes,

      permissionCodes,
    };
  }

  private async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,

        userId,

        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,

      message: 'Email hoặc mật khẩu không đúng.',
    });
  }

  private invalidSession(): UnauthorizedException {
    return new UnauthorizedException({
      code: AUTH_ERROR_CODES.SESSION_INVALID,

      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
    });
  }
}
