import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetUserResponseDto, UserErrorResponseDto } from '../response';

export const GetUserDocs = applyDecorators(
  ApiOperation({ summary: 'Get current user details' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({
    description: 'Current user details',
    type: GetUserResponseDto,
  }),
  ApiResponse({
    status: 401,
    description: 'Invalid or missing token',
    type: UserErrorResponseDto,
  }),
);
