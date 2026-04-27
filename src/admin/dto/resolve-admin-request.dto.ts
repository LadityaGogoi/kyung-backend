import { IsIn } from 'class-validator';
import { AdminRequestStatus } from '@prisma/client';

export class ResolveAdminRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: AdminRequestStatus;
}
