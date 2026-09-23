import type { JwtSignOptions } from '@nestjs/jwt';

export const JWTAccessOptions: JwtSignOptions = {
  secret: process.env.ACCESS_SECRET_KEY,
  expiresIn: '1d' as const,
};

export const JWTRefreshOptions: JwtSignOptions = {
  secret: process.env.REFRESH_SECRET_KEY,
  expiresIn: '7d' as const,
};
