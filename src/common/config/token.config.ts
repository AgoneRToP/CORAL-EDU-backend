import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { JWTAccessOptions, JWTRefreshOptions } from './jwt';

export class TokenConfig {
  constructor(private readonly jwtService: JwtService) {}

  async generateToken(
    user: Pick<User, 'id' | 'phone'>,
    accessTokenOnly?: boolean,
  ) {
    const tokens: { accessToken?: string; refreshToken?: string } = {
      accessToken: undefined,
      refreshToken: undefined,
    };

    tokens.accessToken = await this.jwtService.signAsync(
      {
        id: user.id,
        phone: user.phone,
      },
      JWTAccessOptions,
    );
    if (!accessTokenOnly) {
      tokens.refreshToken = await this.jwtService.signAsync(
        {
          id: user.id,
        },
        JWTRefreshOptions,
      );
    } else {
      delete tokens.refreshToken;
    }

    return tokens;
  }
}
