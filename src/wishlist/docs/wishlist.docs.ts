import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  WishlistResponseDto,
  WishlistItemAddedResponseDto,
} from '../response';
import { UserErrorResponseDto } from '../../user/response/error.response';
import { MessageResponse } from '@utils';

export const GetWishlistDocs = applyDecorators(
  ApiOperation({ summary: 'Get current user wishlist with product details' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'User wishlist', type: WishlistResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);

export const AddToWishlistDocs = applyDecorators(
  ApiOperation({ summary: 'Add a product to the wishlist' }),
  ApiBearerAuth('access-token'),
  ApiCreatedResponse({ description: 'Product added to wishlist', type: WishlistItemAddedResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, description: 'Product not found', type: UserErrorResponseDto }),
  ApiResponse({ status: 409, description: 'Product already in wishlist', type: UserErrorResponseDto }),
);

export const RemoveFromWishlistDocs = applyDecorators(
  ApiOperation({ summary: 'Remove a product from the wishlist' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'productId', description: 'Product ID to remove' }),
  ApiOkResponse({ description: 'Product removed from wishlist', type: MessageResponse }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, description: 'Item not in wishlist', type: UserErrorResponseDto }),
);

export const ClearWishlistDocs = applyDecorators(
  ApiOperation({ summary: 'Clear all items from the wishlist' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Wishlist cleared', type: MessageResponse }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);
