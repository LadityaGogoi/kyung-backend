import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

/** User detail payload (no password) */
export class UserDetailDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional()
  name: string | null;

  @ApiProperty()
  phone: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiPropertyOptional()
  avatarUrl: string | null;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  phoneVerified: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
