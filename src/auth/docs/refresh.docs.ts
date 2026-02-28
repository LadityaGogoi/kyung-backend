import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { RefreshTokenDto } from '../dto';
import {
  RefreshResponseDto,
  AuthErrorResponseDto,
} from '../response';

export const RefreshDocs = applyDecorators(
  ApiOperation({ summary: 'Refresh access token using refresh token' }),
  ApiBody({ type: RefreshTokenDto }),
  ApiOkResponse({
    description: 'New access and refresh tokens returned',
    type: RefreshResponseDto,
  }),
  ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    type: AuthErrorResponseDto,
  }),
  ApiResponse({
    status: 400,
    description: 'Validation error',
  }),
);
