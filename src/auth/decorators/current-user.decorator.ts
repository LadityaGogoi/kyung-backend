import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserWithoutPassword } from '@auth/strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserWithoutPassword => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
