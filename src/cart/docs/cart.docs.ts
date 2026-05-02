import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CartResponseDto } from '../response';
import { UserErrorResponseDto } from '../../user/response/error.response';

const GuestSessionHeader = ApiHeader({
  name: 'x-guest-session-id',
  description: 'Guest session identifier (UUID generated client-side)',
  required: true,
});

export const GetGuestCartDocs = applyDecorators(
  ApiOperation({ summary: 'Get guest cart (keyed by session ID)' }),
  GuestSessionHeader,
  ApiOkResponse({
    description: 'Map of productId → quantity',
    schema: {
      type: 'object',
      additionalProperties: { type: 'integer' },
      example: { clxyz123: 2 },
    },
  }),
);

export const UpsertGuestCartItemDocs = applyDecorators(
  ApiOperation({ summary: 'Add / update / remove a guest cart item (quantity 0 = remove)' }),
  GuestSessionHeader,
  ApiOkResponse({
    description: 'Updated guest cart map',
    schema: {
      type: 'object',
      additionalProperties: { type: 'integer' },
      example: { clxyz123: 2 },
    },
  }),
);

export const GetUserCartDocs = applyDecorators(
  ApiOperation({ summary: 'Get authenticated user cart with product details' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'User cart', type: CartResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);

export const UpsertUserCartItemDocs = applyDecorators(
  ApiOperation({ summary: 'Add / update / remove a cart item (quantity 0 = remove)' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Updated cart', type: CartResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);

export const MergeGuestCartDocs = applyDecorators(
  ApiOperation({ summary: 'Merge guest cart into user cart (call on login)' }),
  ApiBearerAuth('access-token'),
  GuestSessionHeader,
  ApiOkResponse({ description: 'Merge complete' }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);
