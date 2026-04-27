import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { AdminRequestType, UserRole } from '@prisma/client';

export class CreateAdminRequestDto {
  @IsEnum(AdminRequestType)
  type: AdminRequestType;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsEnum(UserRole)
  targetRole?: UserRole;

  @IsOptional()
  @IsString()
  targetProductId?: string;

  @IsOptional()
  @IsString()
  targetOrderId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;
}
