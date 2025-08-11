// src/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.get('x-refresh-token') || null,
      ]),
      secretOrKey: process.env.JWT_REFRESH_SECRET,
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }
  async validate(req: Request, payload: any) {
    const refreshToken = req.get('x-refresh-token');
    if (!refreshToken) throw new UnauthorizedException('리프레시 토큰 없음');

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshToken) throw new UnauthorizedException();

    // DB에 저장된 해시와 비교
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) throw new UnauthorizedException('리프레시 토큰 불일치');

    return { id: user.id, email: user.email, role: user.role };
  }
}
