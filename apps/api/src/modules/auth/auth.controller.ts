import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import {
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

import {
  Public,
} from '../../common/decorators/public.decorator';

import type {
  AuthenticatedUser,
} from '../../common/types/authenticated-user.types';

import {
  AuthService,
} from './auth.service';

import {
  LoginDto,
} from './dto/login.dto';

import {
  RefreshTokenDto,
} from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService:
      AuthService,
  ) {}

  /**
   * POST /api/auth/login
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body()
    dto: LoginDto,
  ) {
    return this.authService
      .login(dto);
  }

  /**
   * POST /api/auth/refresh
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body()
    dto: RefreshTokenDto,
  ) {
    return this.authService
      .refresh(dto);
  }

  /**
   * GET /api/auth/me
   */
  @Get('me')
  me(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return user;
  }

  /**
   * POST /api/auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.authService
      .logout(user);
  }
}
