import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { PrismaService } from '@prisma/prisma.service';
import type { JwtPayload, UserWithoutPassword } from '@common/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const accessSecret = config.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not defined in environment');
    }
    const options: StrategyOptions = {
      jwtFromRequest: (req) => {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req) as
          | string
          | null;
        if (req) {
          (req as Request & { _jwtStrategyReq?: Request })._jwtStrategyReq =
            req;
        }
        return token;
      },
      secretOrKey: accessSecret,
      passReqToCallback: true,
    };

    super(options);
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        message: {
          title: 'Authentication Failed',
          subTitle: 'Invalid access token',
        },
      });
    }

    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
