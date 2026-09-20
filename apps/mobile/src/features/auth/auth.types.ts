export type AuthUser = {
  id: string;
  icdId: string;
  sessionId: string;
  name: string;
  email: string;
  roleCodes: string[];
  permissionCodes: string[];
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};
