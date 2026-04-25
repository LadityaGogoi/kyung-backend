import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUserResponseDto, UserErrorResponseDto } from '../response';

export const UpdateProfileDocs = applyDecorators(
  ApiOperation({ summary: 'Update current user profile' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Profile updated', type: GetUserResponseDto }),
  ApiResponse({ status: 401, description: 'Unauthorized', type: UserErrorResponseDto }),
  ApiResponse({ status: 409, description: 'Phone already in use', type: UserErrorResponseDto }),
);
