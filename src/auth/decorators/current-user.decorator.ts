import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserWithoutPassword } from '@common/types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserWithoutPassword => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
