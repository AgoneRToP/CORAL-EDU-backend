import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtRefreshGuard } from '@/common/guards/jwt-refresh.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    res: Response,
    tokens: { accessToken?: string; refreshToken?: string },
  ) {
    if (tokens.accessToken) {
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        secure: false,
      });
    }
    if (tokens.refreshToken) {
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        secure: false,
        path: '/auth',
      });
    }
  }

  @Public()
  @Post('/login')
  async login(
    @Body() payload: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(payload);
    this.setAuthCookies(res, result.tokens);
    return result;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('/refresh')
  async refresh(
    @CurrentUser() user: { id: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(user.id);
    this.setAuthCookies(res, tokens);
    return { success: true };
  }

  @Public()
  @Post('/logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/auth' });
    return { success: true };
  }

  @Get('/me')
  async me(@CurrentUser() user: { id: number }) {
    return this.authService.me(user.id);
  }
}
