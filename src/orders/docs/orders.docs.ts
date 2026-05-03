import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { OrderDto, OrderListResponseDto, OrderMutationResponseDto } from '../response';
import { UserErrorResponseDto } from '../../user/response/error.response';
import { MessageResponse } from '@utils';

export const CreateOrderDocs = applyDecorators(
  ApiOperation({ summary: 'Place an order from the current cart' }),
  ApiBearerAuth('access-token'),
  ApiCreatedResponse({ description: 'Order created', type: OrderMutationResponseDto }),
  ApiResponse({ status: 400, description: 'Empty cart or insufficient stock', type: UserErrorResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, description: 'Address or product not found', type: UserErrorResponseDto }),
);

export const ListMyOrdersDocs = applyDecorators(
  ApiOperation({ summary: 'List authenticated user orders (paginated)' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Paginated order list', type: OrderListResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);

export const ListOrdersAdminDocs = applyDecorators(
  ApiOperation({ summary: 'List all orders (staff)' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Paginated order list', type: OrderListResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
);

export const GetOrderDocs = applyDecorators(
  ApiOperation({ summary: 'Get order detail (customer sees own; staff sees any)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Order ID' }),
  ApiOkResponse({ description: 'Order detail', type: OrderDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const UpdateOrderStatusDocs = applyDecorators(
  ApiOperation({ summary: 'Update order status (admin)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Order ID' }),
  ApiOkResponse({ description: 'Status updated', type: OrderMutationResponseDto }),
  ApiResponse({ status: 400, description: 'Invalid status transition', type: UserErrorResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const CancelOrderDocs = applyDecorators(
  ApiOperation({ summary: 'Cancel a PENDING order (customer)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Order ID' }),
  ApiOkResponse({ description: 'Order cancelled', type: MessageResponse }),
  ApiResponse({ status: 400, description: 'Order cannot be cancelled', type: UserErrorResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);
