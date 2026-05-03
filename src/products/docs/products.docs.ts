import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import {
  ProductListingResponseDto,
  ProductDetailDto,
  ProductStaffDetailDto,
  ProductMutationResponseDto,
  ProductImagesUpdatedResponseDto,
  ProductInventoryResponseDto,
  ProductStaffListingResponseDto,
} from '../response';
import { UserErrorResponseDto } from '../../user/response/error.response';
import { MessageResponse } from '@utils';

export const ListProductsDocs = applyDecorators(
  ApiOperation({
    summary: 'List active products (storefront)',
    description:
      'Supports filters: category, subcategory, gender, price range, featured, in-stock, search, sort.',
  }),
  ApiOkResponse({ description: 'Paginated product cards', type: ProductListingResponseDto }),
);

export const GetProductBySlugDocs = applyDecorators(
  ApiOperation({ summary: 'Get active product by slug (PDP)' }),
  ApiParam({ name: 'slug', description: 'Product URL slug' }),
  ApiOkResponse({ description: 'Product detail', type: ProductDetailDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const GetProductByIdDocs = applyDecorators(
  ApiOperation({ summary: 'Get active product by id (PDP)' }),
  ApiParam({ name: 'id', description: 'Product id' }),
  ApiOkResponse({ description: 'Product detail', type: ProductDetailDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const ListProductsFlatStaffDocs = applyDecorators(
  ApiOperation({ summary: 'List products for staff (includes inactive)' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Paginated products with relations', type: ProductStaffListingResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
);

export const GetProductStaffByIdDocs = applyDecorators(
  ApiOperation({ summary: 'Get product by id (staff, any active flag)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Product id' }),
  ApiOkResponse({ description: 'Full product for admin/editor', type: ProductStaffDetailDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const CreateProductDocs = applyDecorators(
  ApiOperation({ summary: 'Create product (admin)' }),
  ApiBearerAuth('access-token'),
  ApiCreatedResponse({ description: 'Product created', type: ProductMutationResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
  ApiResponse({ status: 409, description: 'Slug or SKU already exists' }),
);

export const UpdateProductDocs = applyDecorators(
  ApiOperation({ summary: 'Update product (admin)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Product id' }),
  ApiOkResponse({ description: 'Product updated', type: ProductMutationResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
  ApiResponse({ status: 409, description: 'Slug or SKU already exists' }),
);

export const SetProductImagesDocs = applyDecorators(
  ApiOperation({
    summary: 'Replace product images (admin)',
    description:
      'Upload files via POST /v1/upload/product-image (Cloudinary), then send ordered url + publicId here.',
  }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Product id' }),
  ApiOkResponse({ description: 'Images replaced', type: ProductImagesUpdatedResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const AdjustInventoryDocs = applyDecorators(
  ApiOperation({ summary: 'Adjust inventory (admin)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Product id' }),
  ApiOkResponse({ description: 'Stock updated', type: ProductInventoryResponseDto }),
  ApiResponse({ status: 400, type: UserErrorResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const DeleteProductDocs = applyDecorators(
  ApiOperation({ summary: 'Delete product (admin)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Product id' }),
  ApiOkResponse({ description: 'Product deleted', type: MessageResponse }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);
