import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { UserWithoutPassword } from '@common/types';
import { can } from '../roles';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  handleRequest<TUser = UserWithoutPassword>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    const validated = super.handleRequest(
      err,
      user,
      info,
      context,
      status,
    ) as UserWithoutPassword;

    if (!can(validated.role, 'STAFF')) {
      throw new ForbiddenException({
        message: { title: 'Forbidden', subTitle: 'Admin access required' },
      });
    }

    return validated as TUser;
  }
}
