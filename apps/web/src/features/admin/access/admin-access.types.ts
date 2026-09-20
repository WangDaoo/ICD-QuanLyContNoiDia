export type AdminUserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | string;

export type AdminPermission = {
  id?: string | null;
  code: string;
  name?: string | null;
  description?: string | null;
  group?: string | null;
};

export type AdminRole = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  permissions: string[];
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  active: boolean;
  status: AdminUserStatus;
  roleId?: string | null;
  roleCode?: string | null;
  roleName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastLoginAt?: string | null;
};

export type AdminBootstrap = {
  users: AdminUser[];
  roles: AdminRole[];
  permissions: AdminPermission[];
  currentUserId?: string | null;
};

export type UpdateAdminUserInput = {
  name: string;
  roleId: string;
  roleCode: string;
  active: boolean;
};
