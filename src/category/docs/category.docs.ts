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
  CategoryTreeNodeDto,
  CategoryMutationResponseDto,
  CategoryFlatRowDto,
} from '../response';
import { UserErrorResponseDto } from '../../user/response/error.response';
import { MessageResponse } from '@utils';

export const GetCategoryTreeDocs = applyDecorators(
  ApiOperation({ summary: 'Get active category tree (nested by parent/child)' }),
  ApiOkResponse({
    description: 'Root categories with nested children',
    type: CategoryTreeNodeDto,
    isArray: true,
  }),
);

export const ListCategoriesFlatAdminDocs = applyDecorators(
  ApiOperation({ summary: 'List categories as a flat list (admin)' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({
    description: 'Active categories ordered by name',
    type: CategoryFlatRowDto,
    isArray: true,
  }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
);

export const CreateCategoryDocs = applyDecorators(
  ApiOperation({ summary: 'Create a category (admin)' }),
  ApiBearerAuth('access-token'),
  ApiCreatedResponse({ description: 'Category created', type: CategoryMutationResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
  ApiResponse({ status: 409, description: 'Slug already exists' }),
);

export const UpdateCategoryDocs = applyDecorators(
  ApiOperation({ summary: 'Update a category (admin)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Category ID' }),
  ApiOkResponse({ description: 'Category updated', type: CategoryMutationResponseDto }),
  ApiResponse({ status: 400, type: UserErrorResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
  ApiResponse({ status: 409, description: 'Slug already exists' }),
);

export const DeleteCategoryDocs = applyDecorators(
  ApiOperation({ summary: 'Delete a category (admin)' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Category ID' }),
  ApiOkResponse({ description: 'Category deleted', type: MessageResponse }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);
