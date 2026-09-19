import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { PartnerApiAuthService } from '../services/partner-api-auth.service';
import type { PartnerApiRequest } from '../types/partner-api.types';

@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private readonly authService: PartnerApiAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PartnerApiRequest>();

    const header = request.headers['x-api-key'];
    const apiKey = Array.isArray(header) ? header[0] : header;

    request.partner = await this.authService.authenticate(apiKey);

    return true;
  }
}
