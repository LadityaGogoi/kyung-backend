import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { GetUserDocs } from './docs';
import type { UserWithoutPassword } from '@auth/strategies/jwt.strategy';
import { CurrentUser } from '@auth/decorators/current-user.decorator';

@ApiTags('user')
@Controller({ path: 'user', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @GetUserDocs
  async me(@CurrentUser() user: UserWithoutPassword) {
    return this.userService.getProfile(user.id);
  }
}
