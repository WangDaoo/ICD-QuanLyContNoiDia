import type {
  AuthenticatedUser,
} from '../../../common/types/authenticated-user.types';

export interface AccessTokenPayload {
  sub: string;

  sid: string;

  type: 'access';

  email: string;
}

export interface RefreshTokenPayload {
  sub: string;

  sid: string;

  jti: string;

  type: 'refresh';
}

export interface AuthTokenPair {
  accessToken: string;

  refreshToken: string;

  tokenType: 'Bearer';

  expiresIn: number;

  refreshExpiresIn: number;

  refreshExpiresAt: Date;
}

export interface AuthResult {
  accessToken: string;

  refreshToken: string;

  tokenType: 'Bearer';

  expiresIn: number;

  refreshExpiresIn: number;

  user: AuthenticatedUser;
}
