import { SetMetadata } from '@nestjs/common';
import type { PartnerApiScope } from '../constants/partner-api.constants';

export const PARTNER_SCOPES_KEY = 'partner-api-scopes';

export const PartnerScopes = (...scopes: PartnerApiScope[]) =>
  SetMetadata(PARTNER_SCOPES_KEY, scopes);
