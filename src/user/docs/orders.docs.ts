import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderListResponseDto, UserErrorResponseDto } from '../response';

export const GetOrdersDocs = applyDecorators(
  ApiOperation({ summary: 'List all orders for current user' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Order list', type: OrderListResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);
