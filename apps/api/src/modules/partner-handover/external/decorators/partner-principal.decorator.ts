import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PartnerApiRequest } from '../types/partner-api.types';

export const PartnerPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<PartnerApiRequest>();
    return request.partner;
  },
);
