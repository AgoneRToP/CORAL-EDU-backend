import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    const authHeader = client.handshake.headers.authorization;
    const authPayload = client.handshake.auth?.token;

    let token = '';

    if (authPayload) {
      token = authPayload;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = client.handshake.query?.token as string;
    }

    if (!token) {
      throw new UnauthorizedException('Отсутствует токен аутентификации');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
      });

      (client as any).user = payload;
    } catch (err) {
      throw new UnauthorizedException(
        'Недействительный или просроченный токен аутентификации',
      );
    }

    return true;
  }
}
