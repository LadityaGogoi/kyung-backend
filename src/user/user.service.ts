import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import type { UserWithoutPassword } from '@auth/strategies/jwt.strategy';
import type { GetUserResponseDto } from './response';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<GetUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        message: {
          title: 'Not Found',
          subTitle: 'User not found',
        },
      });
    }

    const { password: _password, ...userWithoutPassword } = user;
    return {
      message: {
        title: 'Success',
        subTitle: 'User details retrieved successfully',
      },
      user: userWithoutPassword as UserWithoutPassword,
    };
  }
}
