import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUserResponseDto, UserErrorResponseDto } from '../response';
import { MessageResponse } from '@utils';

export const ChangeEmailDocs = applyDecorators(
  ApiOperation({ summary: 'Change email address (requires current password)' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Email updated', type: GetUserResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 409, description: 'Email already in use', type: UserErrorResponseDto }),
);

export const ChangePasswordDocs = applyDecorators(
  ApiOperation({ summary: 'Change password (requires current password)' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Password changed, all sessions revoked', type: MessageResponse }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);

export const RevokeSessionsDocs = applyDecorators(
  ApiOperation({ summary: 'Sign out from all devices (revoke all refresh tokens)' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'All sessions revoked', type: MessageResponse }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);
