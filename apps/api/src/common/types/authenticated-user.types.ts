export interface AuthenticatedUser {
  id: string;

  icdId: string;

  sessionId: string;

  name: string;

  email: string;

  roleCodes: string[];

  permissionCodes: string[];
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string | string[];
  };

  user?: AuthenticatedUser;
}
